/**
 * Read-only source readers. Files are read once into memory; the SHA-256 is computed over
 * exactly the bytes that are parsed, so provenance always refers to what was imported.
 * Nothing in this module writes to the source directory.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import type { CellRow, LoadedSheet, LoadedSource, SourceDescriptor } from '@/domain/imports/types';

function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

function headerName(v: unknown, index: number): string {
  const s = v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim();
  return s || `__col${index + 1}`;
}

export async function loadXlsxSource(dir: string, descriptor: SourceDescriptor): Promise<LoadedSource> {
  const bytes = await readFile(path.join(dir, descriptor.fileName));
  const sheets = await readXlsxFile(bytes);
  const loaded: LoadedSheet[] = sheets.map(({ sheet, data }) => {
    const [headerRow, ...body] = data;
    const header = (headerRow ?? []).map((v, i) => headerName(v, i));
    const rows: CellRow[] = [];
    body.forEach((row, i) => {
      if (!row.some((c) => c !== null && String(c).trim() !== '')) return; // fully blank line
      const cells: Record<string, unknown> = {};
      header.forEach((h, j) => {
        cells[h] = row[j] ?? null;
      });
      rows.push({ ref: { source: descriptor.code, sheet, row: i + 2 }, cells });
    });
    return { name: sheet, header, rows };
  });
  return { descriptor, sha256: sha256(bytes), byteLength: bytes.byteLength, sheets: loaded };
}

// ---------------------------------------------------------------------------------------
// GCAA "Approved UAE Air Operators" PDF
// ---------------------------------------------------------------------------------------

interface TextItem {
  x: number;
  y: number;
  s: string;
  page: number;
}

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const COLUMN_HEADERS = [
  ['organization', /^Organization Name/],
  ['approvalNumber', /^Approval Number/],
  ['organizationType', /^Organization Type/],
  ['issueDate', /^Issue Date/],
  ['expiryDate', /^Expiry Date/],
  ['country', /^Country/],
] as const;
type Column = (typeof COLUMN_HEADERS)[number][0];

async function extractItems(bytes: Uint8Array): Promise<{ items: TextItem[]; numPages: number }> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const numPages = doc.numPages;
  const items: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!('str' in it)) continue;
      const s = it.str.replace(/\s+/g, ' ').trim();
      if (!s || ARABIC.test(s)) continue;
      items.push({ x: Math.round(it.transform[4] as number), y: Math.round(it.transform[5] as number), s, page: p });
    }
  }
  await task.destroy();
  return { items, numPages };
}

/**
 * Rebuilds table rows from positioned text. Columns are located from the header labels;
 * a row is anchored by a line containing any non-name column; name-only lines directly below
 * an anchor (≤ 16pt) are wrapped continuations of that organisation name.
 */
export async function loadGcaaPdfSource(dir: string, descriptor: SourceDescriptor): Promise<LoadedSource> {
  const bytes = await readFile(path.join(dir, descriptor.fileName));
  const hash = sha256(bytes);
  const { items } = await extractItems(new Uint8Array(bytes));

  // Metadata (page 1): "Last Update Date" etc. – kept as its own sheet for provenance.
  const metaRows: CellRow[] = [];
  const page1 = items.filter((i) => i.page === 1);
  const metaLines = groupLines(page1);
  metaLines.forEach((line, idx) => {
    const label = line.filter((i) => i.x < 150).map((i) => i.s).join(' ');
    const value = line.filter((i) => i.x >= 150).map((i) => i.s).join(' ');
    if (label && value) metaRows.push({ ref: { source: descriptor.code, sheet: 'Metadata', row: idx + 1 }, cells: { field: label, value } });
  });

  // Table rows are parsed by CONTENT, not fixed x positions (page layouts differ and the last
  // page has no header). A line containing an approval number anchors a row; text left of the
  // approval number is the organisation name, dates are matched by pattern, the remainder on
  // the right is the country. Lines without an approval number that sit ≤ 16pt below an anchor
  // are wrapped continuations (left side → name, right side → country).
  const APPROVAL = /^(?:UAE-)?(?:AOC-)?(?:AT|AC|AOA|PO)-\d{4}$/;
  const DATE = /\b\d{2}\/[A-Za-z]{3}\/\d{4}\b/g;
  const rows: CellRow[] = [];
  let ordinal = 0;
  let inTable = false;
  for (const pageNo of [...new Set(items.map((i) => i.page))]) {
    const lines = groupLines(items.filter((i) => i.page === pageNo));
    let current: (Record<Column, string[]> & { approvalX: number }) | null = null;
    let currentY = 0;
    const flush = () => {
      if (!current) return;
      ordinal += 1;
      const { approvalX: _x, ...cols } = current;
      const cells = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.join(' ').replace(/\s+/g, ' ').trim() || null]));
      rows.push({ ref: { source: descriptor.code, sheet: 'Approved UAE Air Operators', row: ordinal }, cells });
      current = null;
    };
    for (const line of lines) {
      const headerHits = COLUMN_HEADERS.filter(([, re]) => line.some((i) => re.test(i.s)));
      if (headerHits.length >= 4) {
        inTable = true;
        flush();
        continue;
      }
      if (!inTable) continue;
      const y = line[0]!.y;
      const approvalItem = line.find((i) => APPROVAL.test(i.s));
      if (approvalItem) {
        flush();
        const left = line.filter((i) => i.x < approvalItem.x).map((i) => i.s);
        const rightText = line.filter((i) => i.x > approvalItem.x).map((i) => i.s).join(' ');
        const dates = rightText.match(DATE) ?? [];
        const typeMatch = /UAE Air Operator/i.exec(rightText);
        const country = rightText.replace(DATE, ' ').replace(/UAE Air Operator/i, ' ').replace(/\s+/g, ' ').trim();
        current = {
          approvalX: approvalItem.x,
          organization: left,
          approvalNumber: [approvalItem.s],
          organizationType: typeMatch ? [typeMatch[0]] : [],
          issueDate: dates[0] ? [dates[0]] : [],
          expiryDate: dates[1] ? [dates[1]] : [],
          country: country ? [country] : [],
        };
        currentY = y;
      } else if (current && currentY - y <= 16) {
        for (const it of line) (it.x < current.approvalX ? current.organization : current.country).push(it.s);
        currentY = y;
      }
    }
    flush();
  }

  const header = COLUMN_HEADERS.map(([k]) => k);
  return {
    descriptor,
    sha256: hash,
    byteLength: bytes.byteLength,
    sheets: [
      { name: 'Metadata', header: ['field', 'value'], rows: metaRows },
      { name: 'Approved UAE Air Operators', header, rows },
    ],
  };
}

function groupLines(items: TextItem[]): TextItem[][] {
  const byY = new Map<number, TextItem[]>();
  for (const it of items) {
    const key = [...byY.keys()].find((y) => Math.abs(y - it.y) <= 2) ?? it.y;
    byY.set(key, [...(byY.get(key) ?? []), it]);
  }
  return [...byY.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v.sort((a, b) => a.x - b.x));
}

export async function loadSource(dir: string, d: SourceDescriptor): Promise<LoadedSource> {
  return d.kind === 'PDF' ? loadGcaaPdfSource(dir, d) : loadXlsxSource(dir, d);
}

export async function fileSha256(file: string): Promise<string> {
  return sha256(await readFile(file));
}

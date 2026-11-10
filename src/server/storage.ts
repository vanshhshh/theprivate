import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DocumentKind } from '@/generated/prisma/enums';
import { prisma, type Tx } from '@/server/db/client';
import { AppError } from '@/server/errors';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x) },
  { mime: 'image/webp', ext: 'webp', test: (b) => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => String.fromCharCode(...b.slice(0, 5)) === '%PDF-' },
];

/** Detects the real type from magic bytes; the browser-supplied MIME type is ignored. */
export function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}

export interface StorageDriver {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

class LocalDriver implements StorageDriver {
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(path.resolve(this.root))) throw new Error('Invalid storage key');
    return p;
  }
  async put(key: string, bytes: Uint8Array) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, bytes);
  }
  async get(key: string) {
    return new Uint8Array(await readFile(this.resolve(key)));
  }
}

/** S3-compatible driver boundary: not active until credentials are configured. */
function driver(): StorageDriver {
  if ((process.env.STORAGE_DRIVER ?? 'local') !== 'local') {
    throw new AppError('NOT_CONFIGURED', 'Object storage is not configured for this environment.');
  }
  return new LocalDriver(process.env.STORAGE_LOCAL_DIR ?? './storage');
}

export async function storeUpload(
  file: File,
  opts: { kind: DocumentKind; uploadedById: string; allowed: ('image' | 'pdf')[] },
  tx: Tx | typeof prisma = prisma,
) {
  if (!(file instanceof File) || file.size === 0) throw new AppError('VALIDATION', 'Please choose a file.');
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError('VALIDATION', 'Files must be 10 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  const okType = type && opts.allowed.some((a) => (a === 'pdf' ? type.mime === 'application/pdf' : type.mime.startsWith('image/')));
  if (!type || !okType) throw new AppError('VALIDATION', `Unsupported file. Allowed: ${opts.allowed.join(', ')}.`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${type.ext}`;
  await driver().put(key, bytes);
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || `upload.${type.ext}`;
  return tx.document.create({ data: { kind: opts.kind, storageKey: key, fileName: safeName, mimeType: type.mime, byteSize: file.size, sha256, uploadedById: opts.uploadedById } });
}

export async function readStored(key: string) {
  return driver().get(key);
}

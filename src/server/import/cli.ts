import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildImportPlan } from '@/domain/imports/plan';
import { planHash } from '@/domain/imports/hash';
import { renderPlanReport } from '@/domain/imports/report';
import type { LoadedSource } from '@/domain/imports/types';
import { SOURCES } from './sources';
import { fileSha256, loadSource } from './readers';

export async function loadAllSources(dir: string): Promise<LoadedSource[]> {
  const loaded: LoadedSource[] = [];
  for (const d of SOURCES) loaded.push(await loadSource(dir, d));
  return loaded;
}

/** Re-hash every file after reading to prove the import never altered the originals. */
async function assertSourcesUnchanged(dir: string, loaded: LoadedSource[]) {
  for (const s of loaded) {
    const now = await fileSha256(path.join(dir, s.descriptor.fileName));
    if (now !== s.sha256) throw new Error(`Source file changed during import: ${s.descriptor.fileName}`);
  }
}

export async function runInspect(dir: string) {
  const loaded = await loadAllSources(dir);
  for (const s of loaded) {
    console.log(`\n${s.descriptor.fileName}  [${s.descriptor.code}, ${s.descriptor.role}]  sha256=${s.sha256.slice(0, 16)}…`);
    for (const sh of s.sheets) {
      console.log(`  • ${sh.name.padEnd(28)} ${String(sh.rows.length).padStart(4)} rows  | ${sh.header.slice(0, 8).join(', ')}${sh.header.length > 8 ? ', …' : ''}`);
    }
  }
  await assertSourcesUnchanged(dir, loaded);
}

export async function runDryRun(dir: string, opts: { against: 'empty' | 'database' }) {
  const loaded = await loadAllSources(dir);
  const plan = buildImportPlan(loaded);
  const hash = planHash(plan);
  let diff = null;
  if (opts.against === 'database') {
    const { diffAgainstDatabase } = await import('./apply');
    diff = await diffAgainstDatabase(plan, loaded);
  }
  await assertSourcesUnchanged(dir, loaded);
  const outDir = path.resolve('reports/import');
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const md = renderPlanReport(plan, hash, { generatedAt: new Date().toISOString(), diff });
  await writeFile(path.join(outDir, `dry-run-${stamp}.md`), md, 'utf8');
  await writeFile(path.join(outDir, 'latest-dry-run.md'), md, 'utf8');
  await writeFile(path.join(outDir, `plan-${hash.slice(0, 12)}.json`), JSON.stringify(plan, null, 2), 'utf8');
  console.log(md.split('\n').slice(0, 60).join('\n'));
  console.log(`\nPlan hash: ${hash}\nFull report: reports/import/latest-dry-run.md`);
}

export async function runApply(dir: string, approvedHash: string, actor: string) {
  const loaded = await loadAllSources(dir);
  const plan = buildImportPlan(loaded);
  const hash = planHash(plan);
  if (hash !== approvedHash) {
    throw new Error(`Plan hash mismatch. Approved ${approvedHash}, current ${hash}. Sources or importer changed: re-run the dry run and review again.`);
  }
  await assertSourcesUnchanged(dir, loaded);
  const { applyPlan } = await import('./apply');
  const result = await applyPlan(plan, hash, loaded, actor);
  console.log(JSON.stringify(result, null, 2));
}

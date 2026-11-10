/**
 * ThePrivate data import CLI.
 *
 *   npm run import:inspect                      – list every source, sheet, header and row count
 *   npm run import:dry-run                      – build the plan, write reports/import/*, no DB writes
 *   npm run import:apply -- --approve <hash>    – apply a previously reviewed plan (hash must match)
 *
 * Source directory: $IMPORT_SOURCE_DIR or ./ThePrivate_Aviation_Database_Bundle
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runInspect, runDryRun, runApply } from '@/server/import/cli';

if (existsSync('.env')) process.loadEnvFile('.env');

const [command, ...rest] = process.argv.slice(2);
const sourceDir = path.resolve(process.env.IMPORT_SOURCE_DIR ?? 'ThePrivate_Aviation_Database_Bundle');

function flag(name: string): string | undefined {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

async function main() {
  switch (command) {
    case 'inspect':
      await runInspect(sourceDir);
      break;
    case 'dry-run':
      await runDryRun(sourceDir, { against: rest.includes('--against-db') ? 'database' : 'empty' });
      break;
    case 'apply': {
      const approve = flag('approve');
      if (!approve) throw new Error('apply requires --approve <planHash> from a reviewed dry-run report');
      await runApply(sourceDir, approve, flag('actor') ?? 'cli');
      break;
    }
    default:
      console.error('Usage: import.ts <inspect|dry-run|apply> [--approve <planHash>] [--against-db]');
      process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exitCode = 1;
});

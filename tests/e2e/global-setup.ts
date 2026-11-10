import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npx tsx scripts/e2e-prepare.ts', { stdio: 'inherit', env: process.env });
}

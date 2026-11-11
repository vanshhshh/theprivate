// `cap sync android` for LOCAL test builds only: allows the https://localhost app to reach the
// plain-HTTP development backend (10.0.2.2) and enables WebView debugging. Never use for releases;
// a plain `npx cap sync` restores the strict settings.
import { execSync } from 'node:child_process';
execSync('npx cap sync android', { stdio: 'inherit', env: { ...process.env, CAP_LOCAL_DEV: '1' } });

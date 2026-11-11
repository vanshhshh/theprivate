// One-off Firebase setup with the service account in mobile/signing/ (git-ignored).
//   node scripts/firebase-setup.mjs check     → verify credentials + FCM send permission (dry run)
//   node scripts/firebase-setup.mjs apps      → ensure Android + iOS apps exist; download config files
// Never prints key material.
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(path.join(here, '../signing/firebase-service-account.json'), 'utf8'));
const PROJECT = sa.project_id;
const APP_ID = 'in.theprivate.app';

async function token(scope) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`token: ${r.status} ${j.error_description ?? j.error}`);
  return j.access_token;
}

async function call(t, method, url, body) {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let j = {};
  try { j = JSON.parse(text); } catch { j = { raw: text.slice(0, 200) }; }
  return { status: r.status, j };
}

async function waitOp(t, name) {
  for (let i = 0; i < 30; i++) {
    const r = await call(t, 'GET', `https://firebase.googleapis.com/v1beta1/${name}`);
    if (r.j.done) return r.j;
    await new Promise((s) => setTimeout(s, 2000));
  }
  throw new Error('operation timed out');
}

const mode = process.argv[2] ?? 'check';
if (mode === 'check') {
  const t = await token('https://www.googleapis.com/auth/firebase.messaging');
  console.log('auth: ok (project', PROJECT + ')');
  const r = await call(t, 'POST', `https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, { validate_only: true, message: { token: 'dry-run-not-a-real-device-token', notification: { title: 'ThePrivate', body: 'test' } } });
  const code = r.j.error?.details?.find((d) => d.errorCode)?.errorCode ?? r.j.error?.status;
  console.log('fcm dry-run:', r.status, code ?? 'accepted', r.status === 400 || r.status === 404 ? '(expected for a dummy token: credentials and API are working)' : '');
  const t2 = await token('https://www.googleapis.com/auth/cloud-platform');
  const a = await call(t2, 'GET', `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/androidApps`);
  const i = await call(t2, 'GET', `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/iosApps`);
  console.log('management api: android', a.status, (a.j.apps ?? []).map((x) => x.packageName), '| ios', i.status, (i.j.apps ?? []).map((x) => x.bundleId), a.j.error?.message ?? '');
}

if (mode === 'apps') {
  const t = await token('https://www.googleapis.com/auth/cloud-platform');
  const base = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}`;
  let android = (await call(t, 'GET', `${base}/androidApps`)).j.apps?.find((x) => x.packageName === APP_ID);
  if (!android) {
    const op = await call(t, 'POST', `${base}/androidApps`, { packageName: APP_ID, displayName: 'ThePrivate (Android)' });
    if (op.status >= 300) throw new Error(`create android: ${op.status} ${op.j.error?.message}`);
    android = (await waitOp(t, op.j.name)).response;
    console.log('created android app', android.appId);
  } else console.log('android app exists', android.appId);
  let ios = (await call(t, 'GET', `${base}/iosApps`)).j.apps?.find((x) => x.bundleId === APP_ID);
  if (!ios) {
    const op = await call(t, 'POST', `${base}/iosApps`, { bundleId: APP_ID, displayName: 'ThePrivate (iOS)' });
    if (op.status >= 300) throw new Error(`create ios: ${op.status} ${op.j.error?.message}`);
    ios = (await waitOp(t, op.j.name)).response;
    console.log('created ios app', ios.appId);
  } else console.log('ios app exists', ios.appId);

  const ac = await call(t, 'GET', `https://firebase.googleapis.com/v1beta1/${android.name}/config`);
  writeFileSync(path.join(here, '../android/app/google-services.json'), Buffer.from(ac.j.configFileContents, 'base64'));
  const ic = await call(t, 'GET', `https://firebase.googleapis.com/v1beta1/${ios.name}/config`);
  writeFileSync(path.join(here, '../ios/App/App/GoogleService-Info.plist'), Buffer.from(ic.j.configFileContents, 'base64'));
  console.log('config files written (git-ignored): android/app/google-services.json, ios/App/App/GoogleService-Info.plist');
}

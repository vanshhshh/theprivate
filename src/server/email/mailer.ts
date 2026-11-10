import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Server-side SMTP sender. Configuration comes only from environment variables; credentials are
 * never logged, returned to a browser, or included in error messages.
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD (or SMTP_APP_PASSWORD),
 *   SMTP_FROM_NAME, SMTP_FROM_EMAIL, SMTP_REPLY_TO
 *   SMTP_TRANSPORT=capture  → no network: messages are kept in memory (tests, dry runs)
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
}

export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export type SendErrorKind = 'HARD_BOUNCE' | 'TRANSIENT' | 'AUTH' | 'CONFIG' | 'UNKNOWN';

export class SendError extends Error {
  constructor(public readonly kind: SendErrorKind, message: string, public readonly code?: string | number) {
    super(message);
  }
}

/** Messages "sent" with SMTP_TRANSPORT=capture (tests and previews). */
export const captured: (OutgoingEmail & { from: string })[] = [];

function env(name: string) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function mailerConfig() {
  const user = env('SMTP_USER');
  // App passwords (e.g. Google's) are shown in space-separated groups but never contain spaces.
  const password = env('SMTP_PASSWORD') ?? env('SMTP_APP_PASSWORD')?.replace(/\s+/g, '');
  const host = env('SMTP_HOST') ?? (user?.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const port = Number(env('SMTP_PORT') ?? 465);
  const secure = env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465;
  const fromEmail = env('SMTP_FROM_EMAIL') ?? user;
  const fromName = env('SMTP_FROM_NAME') ?? 'ThePrivate';
  const replyTo = env('SMTP_REPLY_TO') ?? null;
  const capture = env('SMTP_TRANSPORT') === 'capture';
  const missing = capture ? [] : [!host && 'SMTP_HOST', !user && 'SMTP_USER', !password && 'SMTP_PASSWORD', !fromEmail && 'SMTP_FROM_EMAIL'].filter(Boolean) as string[];
  return { host, port, secure, user, password, fromEmail, fromName, replyTo, capture, missing };
}

/** Safe to show to staff: never includes the password. */
export function mailerStatus() {
  const c = mailerConfig();
  return {
    configured: c.missing.length === 0,
    mode: c.capture ? 'capture (no network)' : 'smtp',
    host: c.host ?? null,
    port: c.port,
    secure: c.secure,
    from: c.fromEmail ? `${c.fromName} <${c.fromEmail}>` : null,
    replyTo: c.replyTo,
    missing: c.missing,
  };
}

let transport: Transporter | null = null;
function getTransport(): Transporter {
  const c = mailerConfig();
  if (c.capture) throw new Error('capture transport has no SMTP connection');
  if (c.missing.length) throw new SendError('CONFIG', `E-mail is not configured (missing ${c.missing.join(', ')}).`);
  transport ??= nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user!, pass: c.password! },
    requireTLS: !c.secure,
    pool: true,
    maxConnections: 1,
    logger: false,
    debug: false,
  });
  return transport;
}

/** Maps an SMTP failure to a decision, without echoing server text that could contain secrets. */
export function classify(err: unknown): SendError {
  if (err instanceof SendError) return err;
  const e = err as { responseCode?: number; code?: string; command?: string };
  const rc = e.responseCode;
  if (e.code === 'EAUTH' || rc === 535 || rc === 534 || rc === 530) return new SendError('AUTH', 'The SMTP server rejected the sending credentials.', rc ?? e.code);
  if (rc && rc >= 500 && rc < 600 && (e.command === 'RCPT TO' || [550, 551, 553, 554].includes(rc))) return new SendError('HARD_BOUNCE', `Recipient rejected by the mail server (${rc}).`, rc);
  if ((rc && rc >= 400 && rc < 500) || ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(e.code ?? '')) return new SendError('TRANSIENT', `Temporary delivery problem (${rc ?? e.code}).`, rc ?? e.code);
  return new SendError('UNKNOWN', `Sending failed (${rc ?? e.code ?? 'unknown'}).`, rc ?? e.code);
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const c = mailerConfig();
  const from = `${c.fromName} <${c.fromEmail ?? 'no-reply@localhost'}>`;
  if (c.capture) {
    captured.push({ ...msg, from });
    return { messageId: `captured-${captured.length}`, accepted: [msg.to], rejected: [] };
  }
  try {
    const info = await getTransport().sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      replyTo: msg.replyTo ?? c.replyTo ?? undefined,
      headers: msg.headers,
    });
    const rejected = (info.rejected ?? []).map(String);
    if (rejected.length) throw new SendError('HARD_BOUNCE', 'Recipient rejected by the mail server.', 550);
    return { messageId: info.messageId, accepted: (info.accepted ?? []).map(String), rejected };
  } catch (err) {
    throw classify(err);
  }
}

/** Checks the SMTP connection and credentials without sending anything. */
export async function verifySmtp(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getTransport().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classify(err).message };
  }
}

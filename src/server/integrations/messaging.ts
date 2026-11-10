/**
 * Messaging integration boundary. A provider is returned only when credentials are configured;
 * otherwise callers record SKIPPED_NOT_CONFIGURED. No code path pretends a message was sent.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  name: string;
  send(msg: EmailMessage): Promise<{ providerRef: string }>;
}

class ResendProvider implements EmailProvider {
  name = 'resend';
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(msg: EmailMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    const body = (await res.json()) as { id: string };
    return { providerRef: body.id };
  }
}

export function emailProvider(): EmailProvider | null {
  const { EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM } = process.env;
  if (!EMAIL_PROVIDER || !EMAIL_API_KEY || !EMAIL_FROM) return null;
  if (EMAIL_PROVIDER === 'resend') return new ResendProvider(EMAIL_API_KEY, EMAIL_FROM);
  return null; // other providers (postmark, ses) plug in here
}

/** SMS / WhatsApp: boundaries only until a provider (and India DLT templates) are approved. */
export function smsProvider(): null {
  return null;
}

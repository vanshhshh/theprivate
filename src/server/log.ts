import pino from 'pino';

/** Structured JSON logs. Sensitive fields are redacted at the logger, not by convention. */
export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: ['*.password', '*.token', '*.email', '*.phone', '*.operatorPrice', '*.platformFee', 'req.headers.cookie'], censor: '[redacted]' },
  base: { app: 'theprivate' },
});

/** Error-monitoring boundary: a no-op until SENTRY_DSN (or equivalent) is configured. */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  log.error({ err, ...context }, 'unhandled error');
}

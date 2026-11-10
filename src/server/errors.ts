/** Expected, user-presentable failures. Anything else is a bug and is logged, never shown raw. */
export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'INVALID_STATE' | 'RATE_LIMITED' | 'NOT_CONFIGURED';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Record') => new AppError('NOT_FOUND', `${what} not found.`);
export const forbidden = () => new AppError('FORBIDDEN', 'You do not have access to this.');
export const invalidState = (msg: string) => new AppError('INVALID_STATE', msg);

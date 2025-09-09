export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'user.token',
  'password',
  '*.password',
  'body.password',
  'email',
  'phone',
] as const

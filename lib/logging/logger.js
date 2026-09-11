const sensitiveKeyPattern = /token|secret|password|authorization|api.?key|email|phone|url|path|content/i;

function sanitize(value, key = '') {
  if (sensitiveKeyPattern.test(key)) return '[REDACTED]';
  if (value instanceof Error) return { name: value.name, message: value.message, code: value.code };
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey)]));
  }
  return value;
}

export function log(level, event, fields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(fields),
  };
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (event, fields) => log('info', event, fields),
  warn: (event, fields) => log('warn', event, fields),
  error: (event, fields) => log('error', event, fields),
};

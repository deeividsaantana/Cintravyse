import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Inicializa o Sentry no servidor Express quando SENTRY_DSN estiver definido
 * no ambiente da Render. Sem DSN, atua como no-op sem afetar dev/testes.
 */
export function initServerSentry() {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn || initialized) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  initialized = true;
  return true;
}

export function captureServerException(error, extra) {
  if (!initialized) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

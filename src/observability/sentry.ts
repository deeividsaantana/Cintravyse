import { APP_VERSION } from '../app/version';

type SentryBrowserModule = typeof import('@sentry/react');

let sentryPromise: Promise<SentryBrowserModule | null> | null = null;

/**
 * Inicializa o Sentry no cliente sob demanda somente quando VITE_SENTRY_DSN
 * estiver configurado. Importação dinâmica mantém zero impacto no bundle inicial.
 */
export function initClientSentry(): Promise<SentryBrowserModule | null> {
  const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
  if (!dsn) return Promise.resolve(null);
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react')
      .then(Sentry => {
        Sentry.init({
          dsn,
          release: `cintravyse-erp@${APP_VERSION}`,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
        });
        return Sentry;
      })
      .catch(() => null);
  }
  return sentryPromise;
}

export function captureClientException(error: unknown, context?: Record<string, unknown>): void {
  void initClientSentry().then(Sentry => {
    if (!Sentry) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}

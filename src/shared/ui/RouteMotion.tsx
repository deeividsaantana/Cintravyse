import type { PropsWithChildren } from 'react';

/**
 * Entrada das rotas autenticadas do ERP. Padrão Cintravyse (25/11/2026): a
 * tela troca na hora, como num aplicativo, com um esmaecer de 120 ms em CSS
 * (index.css, .renea-route-motion). Sem deslizar blocos nem biblioteca de
 * animação, que davam cara de site e atrasavam a troca de aba.
 */
export function RouteMotion({ children }: PropsWithChildren) {
  return <div className="renea-route-motion h-full w-full">{children}</div>;
}

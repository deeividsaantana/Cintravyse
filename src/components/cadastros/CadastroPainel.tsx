import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { ArrowLeft, X } from 'lucide-react';
import { FOCO, reduzMovimento } from './estilos';

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  topo?: ReactNode;
  rodape?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  testId?: string;
  /**
   * Tela cheia (ficha do colaborador, pedido de 23/11/2026): cobre o site
   * todo, com Voltar no topo e o conteúdo centralizado, como os lançamentos.
   */
  telaCheia?: boolean;
}

/**
 * Painel que entra pela direita no computador e ocupa a tela no celular.
 * A lista continua atrás, no mesmo lugar, para a pessoa voltar sem perder o
 * filtro. Fecha no X, no Esc e no toque fora.
 */
export default function CadastroPainel({ titulo, subtitulo, topo, rodape, onFechar, children, testId, telaCheia = false }: Props) {
  const painel = useRef<HTMLElement>(null);
  const fundo = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select, button:not([disabled])')?.focus();
    const tecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') fechar.current();
    };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!reduzMovimento() && painel.current && fundo.current) {
      gsap.fromTo(fundo.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
      gsap.fromTo(painel.current, { xPercent: 6, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.32, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, []);

  if (telaCheia) {
    return createPortal(
      <div ref={fundo} data-lancamento="" className="fixed inset-0 z-[120] flex flex-col bg-white">
        <section ref={painel} role="dialog" aria-modal="true" aria-label={titulo} data-testid={testId} className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
              <button type="button" onClick={onFechar} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-bold text-slate-700 transition-colors duration-150 hover:bg-slate-100 ${FOCO}`}>
                <ArrowLeft className="size-5" aria-hidden="true" />
                Voltar à lista
              </button>
              <h2 className="min-w-0 truncate border-l border-slate-200 pl-3 text-base font-bold text-slate-900">{titulo}</h2>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
          </div>
          {rodape && (
            <footer className="border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{rodape}</div>
            </footer>
          )}
        </section>
      </div>,
      document.body,
    );
  }

  // Portal: .erp-module usa container-type, que prenderia o fixed dentro do módulo.
  return createPortal(
    <div
      ref={fundo}
      className="fixed inset-0 z-[120] flex justify-end bg-black/40"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onFechar();
      }}
    >
      <section
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        data-testid={testId}
        className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[480px] sm:rounded-l-2xl"
      >
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            {topo}
            <h2 className="mt-1 break-words text-xl font-bold leading-tight text-slate-900">{titulo}</h2>
            {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-slate-100 hover:text-slate-800 ${FOCO}`}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {rodape && <footer className="border-t border-slate-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{rodape}</footer>}
      </section>
    </div>,
    document.body,
  );
}

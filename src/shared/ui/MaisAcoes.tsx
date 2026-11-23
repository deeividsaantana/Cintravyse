import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { BOTAO_SECUNDARIO } from '../../components/cadastros/estilos';

export interface AcaoDoMenu {
  rotulo: string;
  icone: LucideIcon;
  onClick: () => void;
  desligada?: boolean;
  testId?: string;
}

/**
 * Botão "⋮ Mais ações" do topo de toda aba (padrão de 23/11/2026): o que se usa
 * pouco (importar planilha, link, planilha de compras) sai das subabas e fica
 * aqui, para o topo ter no máximo quatro opções.
 */
export function MaisAcoes({ acoes, testId, extra }: { acoes: readonly AcaoDoMenu[]; testId?: string; extra?: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento: PointerEvent) => { if (!caixa.current?.contains(evento.target as Node)) setAberto(false); };
    const tecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto]);

  if (acoes.length === 0) return null;
  return (
    <div ref={caixa} className="relative shrink-0">
      <button type="button" onClick={() => setAberto(atual => !atual)} aria-expanded={aberto} aria-haspopup="menu" aria-label="Mais ações" title="Mais ações" data-testid={testId} className={`${BOTAO_SECUNDARIO} size-11 min-w-11 justify-center !px-0`}>
        <MoreVertical className="size-5" aria-hidden="true" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-12 z-30 grid min-w-52 gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl">
          {acoes.map(({ rotulo, icone: Icone, onClick, desligada, testId: id }) => (
            <button key={rotulo} type="button" role="menuitem" disabled={desligada} data-testid={id}
              onClick={() => { setAberto(false); onClick(); }}
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Icone className="size-4 shrink-0" aria-hidden="true" />{rotulo}
            </button>
          ))}
          {extra}
        </div>
      )}
    </div>
  );
}

/**
 * Peças comuns das abas Equipamentos e Operadores do Controle de Frotas: o
 * resumo da conferência do dia (contadores e barra de preenchimento) e a
 * grade de quem falta.
 */
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { FOCO } from '../cadastros/estilos';

export const dataCurta = (date: string): string => /^\d{4}-\d{2}-\d{2}$/.test(date)
  ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')
  : date;

interface ResumoProps {
  id: string;
  titulo: string;
  lancados: number;
  total: number;
  acao: ReactNode;
}

/**
 * Cabeçalho curto de cada lista da conferência (pedido de 23/11/2026: menos
 * detalhe): título, "X de Y lançados" com a barrinha e a ação. Sem filtro:
 * a tela já mostra só quem falta.
 */
export function ResumoConferencia({ id, titulo, lancados, total, acao }: ResumoProps) {
  const progresso = total ? Math.round((lancados / total) * 100) : 0;
  return (
    <header className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-base font-bold text-slate-950">{titulo}</h2>
        <div className="mt-1 flex items-center gap-2 text-sm text-[#5b6870]">
          <span className="whitespace-nowrap"><strong className="tabular-nums text-slate-900">{lancados}</strong> de <span className="tabular-nums">{total}</span> lançados</span>
          <span className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${titulo}: lançados`} aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
            <span className="block h-full rounded-full bg-[#176b4d]" style={{ width: `${progresso}%` }} />
          </span>
        </div>
      </div>
      {acao}
    </header>
  );
}

export interface CartaoConferencia {
  id: string;
  /** Prefixo do equipamento ou nome do operador, em letra grande. */
  titulo: string;
  /** Tipo do equipamento ou matrícula do operador. */
  detalhe: string;
  /** Grupo (Basculantes, Apoio) ou nada. */
  grupo?: string;
  informado: boolean;
  /** Situação lançada (Em operação, Em manutenção...). */
  situacao?: string;
  saida?: string;
  /** Caminhão em que o operador foi lançado. */
  onde?: string;
  /** Texto do botão de lançar, lido pelo leitor de tela. */
  rotuloLancar: string;
  onLancar?: () => void;
}

const tomDoLancado = (situacao?: string) => (
  situacao === 'Em manutenção' || situacao === 'Aguardando manutenção'
    ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
);

/**
 * Faltantes e lançados da conferência em cartões grandes, sem tabela: o
 * faltante fica em âmbar, com o nome em destaque e o botão Lançar à mão; o
 * lançado mostra a situação, a saída e o caminhão. Primeiro os faltantes,
 * depois os lançados, cada grupo com o próprio título e a contagem.
 */
export function GradeConferencia({ itens, nomeFaltantes, nomeLancados, vazio, testId, colunas }: {
  itens: readonly CartaoConferencia[];
  nomeFaltantes: string;
  nomeLancados: string;
  vazio: ReactNode;
  testId: string;
  /** Classes de coluna da grade (equipamento cabe mais por linha que operador). */
  colunas: string;
}) {
  const faltantes = itens.filter(item => !item.informado);
  const lancados = itens.filter(item => item.informado);
  if (!itens.length) return <div className="grid flex-1 place-items-center">{vazio}</div>;
  const grupo = (titulo: string, lista: readonly CartaoConferencia[], tom: string) => lista.length > 0 && (
    <section aria-label={`${titulo}: ${lista.length}`} className="grid gap-2">
      <h3 className={`text-sm font-bold ${tom}`}>{titulo} <span className="tabular-nums">· {lista.length}</span></h3>
      <ul className={`grid gap-2 ${colunas}`}>
        {lista.map(item => (
          <li key={item.id} data-linha-lista className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className={`size-2.5 shrink-0 rounded-full ${item.informado ? (tomDoLancado(item.situacao).includes('rose') ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-amber-400'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <strong className={`block truncate text-sm leading-tight text-slate-950 ${/^[A-Z]{2}\d/.test(item.titulo) ? 'font-mono' : ''}`} title={`${item.titulo} · ${item.detalhe}`}>{item.titulo}</strong>
              <span className="block truncate text-xs text-[#5b6870]">{item.informado ? [item.situacao || 'Lançado', item.onde].filter(Boolean).join(' · ') : item.detalhe}</span>
            </span>
            {!item.informado && item.onLancar && (
              <button type="button" onClick={item.onLancar} aria-label={item.rotuloLancar} title="Lançar" className={`grid size-11 shrink-0 place-items-center rounded-lg bg-[#176b4d] text-white hover:brightness-95 md:size-8 ${FOCO}`}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      {grupo(nomeFaltantes, faltantes, 'text-amber-800')}
      {grupo(nomeLancados, lancados, 'text-emerald-800')}
    </div>
  );
}

/** Lista curta de avisos que abre e fecha; o resumo tem altura de toque. */
export function AvisoRecolhivel({ titulo, children, tom }: { titulo: string; children: ReactNode; tom: string }) {
  return (
    <details className={`rounded-xl border px-3 text-sm ${tom}`}>
      <summary className={`flex min-h-11 cursor-pointer items-center font-bold ${FOCO}`}>{titulo}</summary>
      <p className="pb-2">{children}</p>
    </details>
  );
}

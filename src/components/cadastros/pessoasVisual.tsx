/**
 * Peças visuais de Pessoas (redesign de 23/11/2026): a bolinha com as
 * iniciais da pessoa, o selo do nível do cargo e a fila de rostos da equipe.
 * As cores do nível vão do verde-escuro do topo ao verde-claro da base, as
 * mesmas do organograma e da pirâmide, para a pessoa ligar uma tela à outra.
 */
import type { NivelCargo } from '../../types';
import { NIVEIS } from '../../utils/hierarquia';

/** Fundo e letra de cada nível (1 a 6) e de "sem nível" (índice 6). */
export const COR_DO_NIVEL: ReadonlyArray<{ fundo: string; letra: string; claro: string }> = [
  { fundo: '#022b24', letra: '#ffffff', claro: '#e3ece8' },
  { fundo: '#063c31', letra: '#ffffff', claro: '#e3ece8' },
  { fundo: '#0f5a3d', letra: '#ffffff', claro: '#e4f0ea' },
  { fundo: '#176b4d', letra: '#ffffff', claro: '#e6f3ec' },
  { fundo: '#3f8f6e', letra: '#ffffff', claro: '#eaf5ef' },
  { fundo: '#9fcab4', letra: '#022b24', claro: '#eef7f2' },
  { fundo: '#cbd5d0', letra: '#334155', claro: '#f1f5f3' },
];

export const corDoNivel = (nivel?: number | null) => COR_DO_NIVEL[nivel && nivel >= 1 && nivel <= 6 ? nivel - 1 : 6];

export const iniciais = (nome: string) => {
  const partes = nome.replace(/\d+/g, '').trim().split(/\s+/).filter(parte => parte.length > 2 || /^[A-ZÀ-Ú]/.test(parte));
  const primeira = partes[0]?.[0] || nome.trim()[0] || '?';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase();
};

const TAMANHO = { p: 'size-8 text-xs', m: 'size-9 text-xs', g: 'size-14 text-lg' } as const;

/** Bolinha com as iniciais, na cor do nível do cargo da pessoa. */
export function Avatar({ nome, nivel, tamanho = 'm', borda = false }: { nome: string; nivel?: number | null; tamanho?: keyof typeof TAMANHO; borda?: boolean }) {
  const cor = corDoNivel(nivel);
  return (
    <span
      aria-hidden="true"
      style={{ background: cor.fundo, color: cor.letra }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight ${TAMANHO[tamanho]} ${borda ? 'ring-2 ring-white' : ''}`}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Selo do nível: quadradinho na cor do degrau e o nome do nível. */
export function SeloNivel({ nivel, curto = false }: { nivel?: NivelCargo | number | null; curto?: boolean }) {
  const cor = corDoNivel(nivel);
  const dados = nivel && nivel >= 1 && nivel <= 6 ? NIVEIS[nivel - 1] : null;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-800" style={{ background: cor.claro }}>
      <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: cor.fundo }} />
      {dados ? (curto ? dados.nome : `${dados.nivel} · ${dados.nome}`) : 'Sem nível'}
    </span>
  );
}

/** Até quatro rostos da equipe e "+N" para o resto. */
export function FilaDeRostos({ nomes, total }: { nomes: string[]; total: number }) {
  const resto = total - nomes.length;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {nomes.map(nome => <Avatar key={nome} nome={nome} tamanho="p" borda nivel={5} />)}
        {resto > 0 && (
          <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 ring-2 ring-white">+{resto}</span>
        )}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-800">{total} {total === 1 ? 'pessoa' : 'pessoas'}</span>
    </span>
  );
}

interface LinhaResumo { ativo: boolean; filtros: Record<string, string> }

/**
 * Resumo do topo de Colaboradores: quantos estão ativos e quantos ainda
 * faltam ligar (sem equipe, sem líder, sem cargo). Tocar num número filtra a
 * lista por ele; tocar de novo tira o filtro.
 */
export function ResumoColaboradores({ linhas, filtros, onFiltrar }: {
  linhas: readonly LinhaResumo[];
  filtros: Record<string, string>;
  onFiltrar: (filtro: string | null, valor?: string) => void;
}) {
  const ativos = linhas.filter(linha => linha.ativo);
  const contar = (filtro: string, valor: string) => ativos.filter(linha => linha.filtros[filtro] === valor).length;
  const quadros = [
    { rotulo: 'Colaboradores ativos', total: ativos.length, filtro: null, valor: '' },
    { rotulo: 'Sem equipe', total: contar('equipe', 'Sem equipe'), filtro: 'equipe', valor: 'Sem equipe' },
    { rotulo: 'Sem líder', total: contar('lider', 'Sem líder'), filtro: 'lider', valor: 'Sem líder' },
    { rotulo: 'Sem cargo', total: contar('cargo', 'Sem cargo'), filtro: 'cargo', valor: 'Sem cargo' },
  // Contador com zero não aparece (padrão do site, seção 3); o total fica sempre.
  ].filter(quadro => quadro.filtro === null || quadro.total > 0 || filtros[quadro.filtro] === quadro.valor);
  return (
    <div role="group" aria-label="Resumo dos colaboradores" data-testid="resumo-colaboradores" className="grid grid-cols-2 gap-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {quadros.map(quadro => {
        const ligado = quadro.filtro ? filtros[quadro.filtro] === quadro.valor : false;
        const atencao = quadro.filtro !== null && quadro.total > 0;
        return (
          <button
            key={quadro.rotulo}
            type="button"
            aria-pressed={quadro.filtro ? ligado : undefined}
            onClick={() => onFiltrar(ligado ? null : quadro.filtro, quadro.valor)}
            className={`flex min-h-16 flex-col justify-center rounded-2xl border bg-white px-4 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b4d]/40 ${ligado ? 'border-[#f26a2e]/60 ring-2 ring-[#f26a2e]/20' : 'border-slate-200 hover:border-emerald-300'}`}
          >
            <span className="text-2xl font-black tabular-nums text-slate-900">{quadro.total.toLocaleString('pt-BR')}</span>
            <span className={`text-sm font-semibold ${atencao ? 'text-[#c2410c]' : 'text-slate-600'}`}>{quadro.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}

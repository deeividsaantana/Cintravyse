import type { SituacaoSolicitacao } from '../../utils/solicitacoes';

/** Cor do pontinho de cada situação; o texto fica neutro (padrão Cintravyse, 26/11/2026). */
const PONTO: Record<SituacaoSolicitacao, string> = {
  'Pendente Suprimentos': 'bg-amber-500',
  'Em Cotação': 'bg-sky-500',
  'Aguardando Aprovação': 'bg-orange-500',
  Aprovado: 'bg-[#176b4d]',
  'Em Trânsito': 'bg-indigo-500',
  Entregue: 'bg-slate-400',
  Cancelado: 'bg-slate-300',
  'Em Atraso': 'bg-rose-600',
};

/** Selo da situação, com a mesma cor em toda a aba. */
export function SeloSituacao({ situacao }: { situacao: SituacaoSolicitacao }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${situacao === 'Em Atraso' ? 'text-rose-700' : 'text-slate-700'}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${PONTO[situacao]}`} />
      {situacao}
    </span>
  );
}

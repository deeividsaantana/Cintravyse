import { Check } from 'lucide-react';
import { CARGO_DA_ETAPA, ETAPAS, SITUACOES, etapaPendente } from '../../../api/_shared/contratacao-regras.js';
import type { Etapa, PedidoContratacao, SituacaoContratacao } from '../../services/contratacaoApi';
import { dataHoraBr } from './formatos';

/** Cor do pontinho; o texto fica neutro (padrão Cintravyse, 26/11/2026). */
const TOM: Record<SituacaoContratacao, string> = {
  etapa_1: 'bg-amber-500',
  etapa_2: 'bg-amber-500',
  etapa_3: 'bg-amber-500',
  concluido: 'bg-[#176b4d]',
  recusada: 'bg-rose-600',
};

export function SeloSituacaoContratacao({ situacao }: { situacao: SituacaoContratacao }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${situacao === 'recusada' ? 'text-rose-700' : 'text-slate-700'}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${TOM[situacao] ?? TOM.etapa_1}`} />
      {SITUACOES[situacao] ?? situacao}
    </span>
  );
}

/**
 * Os 3 selos em ordem: Recursos Humanos (1ª) → Gerência (2ª) →
 * Gerência (3ª). Verde = já assinou; âmbar = é a vez; cinza = ainda não chegou.
 */
export function SelosDasEtapas({ pedido }: { pedido: PedidoContratacao }) {
  const vez = etapaPendente(pedido);
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Assinaturas do pedido">
      {(ETAPAS as Etapa[]).map((etapa, indice) => {
        const feito = pedido.signatures.some(item => item.stage === etapa);
        const daVez = vez === etapa;
        const recusou = pedido.status === 'recusada' && pedido.rejected_stage === etapa;
        // Só texto e um sinal pequeno: verde assinou, âmbar é a vez, cinza ainda não chegou.
        const tom = recusou ? 'text-rose-700'
          : feito ? 'text-emerald-700'
            : daVez ? 'font-semibold text-amber-800'
              : 'text-slate-500';
        return (
          <li key={etapa} className="flex items-center gap-1">
            {indice > 0 && <span aria-hidden="true" className="text-[#5b6870]">›</span>}
            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium ${tom}`}>
              {feito ? <Check className="size-3" aria-hidden="true" /> : <span aria-hidden="true" className={`size-1.5 rounded-full ${daVez ? 'bg-amber-500' : recusou ? 'bg-rose-600' : 'bg-slate-300'}`} />}
              {indice + 1}ª {CARGO_DA_ETAPA[etapa]}
              <span className="sr-only">{recusou ? ' (recusou)' : feito ? ' (assinou)' : daVez ? ' (é a vez)' : ' (aguardando)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Linha de etapas, como rastreio: Recursos Humanos → Gerência → Gerência → Concluído. */
export function LinhaDeEtapas({ pedido, compacta = false }: { pedido: PedidoContratacao; compacta?: boolean }) {
  const passos = [...(ETAPAS as Etapa[]).map(etapa => ({
    chave: etapa,
    rotulo: CARGO_DA_ETAPA[etapa],
    ordem: `${ETAPAS.indexOf(etapa) + 1}ª`,
    feito: pedido.signatures.find(item => item.stage === etapa),
  })), { chave: 'fim', rotulo: pedido.status === 'recusada' ? 'Recusada' : 'Concluído', ordem: '', feito: undefined }];
  const fim = pedido.status === 'concluido' || pedido.status === 'recusada';
  return (
    <ol className="flex items-start" aria-label="Etapas do pedido">
      {passos.map((passo, indice) => {
        const concluido = passo.chave === 'fim' ? fim : Boolean(passo.feito);
        const recusa = passo.chave === 'fim' && pedido.status === 'recusada';
        return (
          <li key={passo.chave} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {indice > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-3 h-0.5 w-full ${concluido ? 'bg-[#176b4d]' : 'bg-slate-200'}`} />}
            <span className={`relative z-10 grid size-6 place-items-center rounded-full text-xs font-black ${recusa ? 'bg-rose-700 text-white' : concluido ? 'bg-[#176b4d] text-white' : 'border-2 border-slate-300 bg-white text-[#5b6870]'}`}>
              {concluido && !recusa ? <Check className="size-3.5" aria-hidden="true" /> : indice + 1}
            </span>
            <span className={`mt-1 text-xs font-bold ${concluido ? 'text-slate-900' : 'text-[#5b6870]'}`}>{passo.rotulo}</span>
            {passo.ordem && <span className="text-xs text-[#5b6870]">{passo.ordem}<span className="hidden sm:inline"> assinatura</span></span>}
            {!compacta && passo.feito && <span className="hidden text-xs text-[#5b6870] sm:block">{dataHoraBr(passo.feito.signed_at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

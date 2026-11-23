/**
 * Ficha de uma máquina no quadro: prefixo e tipo no alto, a situação escrita
 * numa etiqueta colorida e o operador no rodapé. A faixa esquerda repete a cor
 * da situação; sem lançamento fica tracejada. Pequena de propósito, para caber a frota toda na
 * tela. A ficha inteira é o botão que abre o lançamento da máquina.
 */
import { UserRound, Wrench } from 'lucide-react';
import { ROTULO_GRUPO, type CartaoFrota, type GrupoStatus } from '../../modules/frota/quadroFrota';
import { FOCO } from '../cadastros/estilos';

/** Cor de cada situação: faixa, fundo, etiqueta, bolinha e borda da ficha. */
export const TOM: Record<GrupoStatus, { faixa: string; fundo: string; cartao: string; etiqueta: string; ponto: string; borda: string }> = {
  operando: { faixa: 'bg-[#176b4d]', fundo: 'bg-emerald-50', cartao: 'bg-white', etiqueta: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ponto: 'bg-emerald-500', borda: 'border-l-[#176b4d]' },
  manutencao: { faixa: 'bg-rose-600', fundo: 'bg-rose-50', cartao: 'bg-rose-50/60', etiqueta: 'bg-rose-50 text-rose-800 ring-rose-200', ponto: 'bg-rose-500', borda: 'border-l-rose-500' },
  parado: { faixa: 'bg-amber-400', fundo: 'bg-amber-50', cartao: 'bg-amber-50/60', etiqueta: 'bg-amber-50 text-amber-800 ring-amber-200', ponto: 'bg-amber-400', borda: 'border-l-amber-400' },
  'sem-lancamento': { faixa: 'bg-slate-300', fundo: 'bg-slate-100', cartao: 'bg-slate-50', etiqueta: 'bg-slate-100 text-slate-600 ring-slate-200', ponto: 'bg-slate-400', borda: 'border-l-slate-300' },
};

export const numero = (valor: number) => valor.toLocaleString('pt-BR');

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || '';

/** Tipo curto para caber na ficha: "Caminhão Basculante" vira "Basculante", "Escavadeira hidráulica" vira "Escavadeira". */
const tipoCurto = (tipo: string) => {
  const limpo = tipo.trim().replace(/\s+hidr[aá]ulic[ao]$/i, '');
  const palavras = limpo.split(/\s+/);
  const curto = palavras.length > 1 && /^caminh[aã]o$/i.test(palavras[0]) ? palavras.slice(1).join(' ') : limpo;
  return curto.charAt(0).toLocaleUpperCase('pt-BR') + curto.slice(1);
};

export function CartaoEquipamento({ cartao, onAbrir, selecionado }: { cartao: CartaoFrota; onAbrir: () => void; selecionado?: boolean }) {
  const tom = TOM[cartao.grupo];
  const pendente = cartao.grupo === 'sem-lancamento';
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-pressed={selecionado}
      data-quadro-cartao
      data-situacao={cartao.grupo}
      data-testid={`quadro-cartao-${cartao.prefixo}`}
      title={`${cartao.prefixo} · ${cartao.modelo}${cartao.frente ? ` · ${cartao.frente}` : ''}${cartao.motivoManutencao ? ` · ${cartao.motivoManutencao}` : ''}`}
      aria-label={`${cartao.prefixo}, ${cartao.modelo}, ${ROTULO_GRUPO[cartao.grupo]}${cartao.operador ? `, operador ${cartao.operador}` : ', sem operador'}`}
      className={`relative flex w-full min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border py-2.5 pl-3.5 pr-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-150 hover:border-slate-300 hover:shadow-[0_8px_20px_-12px_rgba(15,40,31,0.35)] active:scale-[0.98] ${pendente ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'} ${selecionado ? 'outline outline-2 outline-offset-1 outline-[#176b4d]' : ''} ${FOCO}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tom.faixa}`} aria-hidden="true" />
      <span className="flex min-w-0 items-baseline gap-2">
        <strong className="shrink-0 font-mono text-base font-extrabold leading-none text-slate-900">{cartao.prefixo}</strong>
        <span className="min-w-0 truncate text-xs font-medium text-slate-500">{tipoCurto(cartao.tipo || cartao.modelo)}</span>
      </span>
      <span className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-bold ring-1 ring-inset ${tom.etiqueta}`}>
        {cartao.grupo === 'manutencao' ? <Wrench className="size-3 shrink-0" aria-hidden="true" /> : <span className={`size-1.5 shrink-0 rounded-full ${tom.ponto}`} aria-hidden="true" />}
        <span className="truncate">{ROTULO_GRUPO[cartao.grupo]}</span>
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 border-t border-slate-100 pr-6 pt-1.5 text-xs font-semibold ${cartao.operador ? 'text-slate-700' : 'text-[#c2410c]'}`}>
        <UserRound className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
        <span className="truncate">{cartao.operador ? primeiroNome(cartao.operador) : 'Sem operador'}</span>
      </span>
    </button>
  );
}

/**
 * Ficha de uma máquina no quadro: prefixo grande, tipo e operador embaixo e a
 * cor da situação na faixa esquerda (sem lançamento fica tracejada). Pequena de propósito, para caber a frota toda na
 * tela. A ficha inteira é o botão que abre o lançamento da máquina.
 */
import { Wrench } from 'lucide-react';
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

/** Tipo curto para caber na ficha: "Caminhão Basculante" vira "Basculante". */
const tipoCurto = (tipo: string) => {
  const limpo = tipo.trim();
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
      className={`relative flex min-h-[4.25rem] w-full min-w-0 flex-col justify-center overflow-hidden rounded-xl border py-1.5 pl-3.5 pr-8 text-left transition duration-150 hover:-translate-y-px hover:shadow-[0_6px_16px_-10px_rgba(15,40,31,0.35)] active:translate-y-0 active:scale-[0.98] motion-reduce:hover:translate-y-0 ${pendente ? 'border-dashed border-slate-300 bg-slate-50' : `border-slate-200 ${tom.cartao}`} ${selecionado ? 'outline outline-2 outline-offset-1 outline-[#176b4d]' : ''} ${FOCO}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tom.faixa}`} aria-hidden="true" />
      <span className="flex min-w-0 items-center gap-1.5">
        <strong className="truncate font-mono text-[0.95rem] font-extrabold leading-tight text-slate-900">{cartao.prefixo}</strong>
        {cartao.grupo === 'manutencao' && <Wrench className="size-3.5 shrink-0 text-rose-600" aria-hidden="true" />}
      </span>
      <span className="truncate text-xs font-medium leading-snug text-slate-500">{tipoCurto(cartao.tipo || cartao.modelo)}</span>
      <span className={`truncate text-xs font-semibold leading-snug ${cartao.operador ? 'text-slate-700' : 'text-[#c2410c]'}`}>
        {cartao.operador ? primeiroNome(cartao.operador) : 'sem operador'}
      </span>
    </button>
  );
}

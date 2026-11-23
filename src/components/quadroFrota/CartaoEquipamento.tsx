/**
 * Ficha de uma máquina no quadro, pequena e limpa: bolinha da situação, prefixo
 * e operador. Sem lançamento fica tracejada; o resto da situação vem no título. Pequena de propósito, para caber a frota toda na
 * tela. A ficha inteira é o botão que abre o lançamento da máquina.
 */
import { ROTULO_GRUPO, type CartaoFrota, type GrupoStatus } from '../../modules/frota/quadroFrota';
import { FOCO } from '../cadastros/estilos';

/** Cor de cada situação: etiqueta e bolinha. */
export const TOM: Record<GrupoStatus, { etiqueta: string; ponto: string }> = {
  operando: { etiqueta: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ponto: 'bg-emerald-500' },
  manutencao: { etiqueta: 'bg-rose-50 text-rose-800 ring-rose-200', ponto: 'bg-rose-500' },
  parado: { etiqueta: 'bg-amber-50 text-amber-800 ring-amber-200', ponto: 'bg-amber-400' },
  'sem-lancamento': { etiqueta: 'bg-slate-100 text-slate-600 ring-slate-200', ponto: 'bg-slate-400' },
};

export const numero = (valor: number) => valor.toLocaleString('pt-BR');

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || '';

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
      title={`${cartao.prefixo} · ${cartao.modelo} · ${ROTULO_GRUPO[cartao.grupo]}${cartao.frente ? ` · ${cartao.frente}` : ''}${cartao.motivoManutencao ? ` · ${cartao.motivoManutencao}` : ''}`}
      aria-label={`${cartao.prefixo}, ${cartao.modelo}, ${ROTULO_GRUPO[cartao.grupo]}${cartao.operador ? `, operador ${cartao.operador}` : ', sem operador'}`}
      className={`flex min-h-12 w-full min-w-0 flex-col justify-center gap-0.5 rounded-lg border py-1.5 pl-2.5 pr-7 text-left transition duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] ${pendente ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'} ${selecionado ? 'bg-emerald-50 outline outline-2 outline-offset-1 outline-[#176b4d]' : ''} ${FOCO}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={`size-2 shrink-0 rounded-full ${tom.ponto}`} aria-hidden="true" />
        <strong className="truncate font-mono text-sm font-bold leading-tight text-slate-900">{cartao.prefixo}</strong>
      </span>
      <span className={`truncate pl-3.5 text-xs leading-tight ${cartao.operador ? 'text-slate-500' : 'font-semibold text-[#c2410c]'}`}>
        {cartao.operador ? primeiroNome(cartao.operador) : 'Sem operador'}
      </span>
    </button>
  );
}

/**
 * Classes repetidas da aba Cadastros, no padrão do Painel de Controle:
 * verde RENEA na ação principal, foco com borda verde-escura sólida, cantos
 * de 12 a 16 px e toque de pelo menos 44 px.
 */
export const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)';

const BOTAO = `inline-flex min-h-11 lg:min-h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;

export const BOTAO_PRIMARIO = `${BOTAO} bg-[#0d261e] text-white shadow-xs hover:bg-[#176b4d]`;
export const BOTAO_SECUNDARIO = `${BOTAO} border border-[#d5ddd8] bg-white text-[#10211c] hover:border-[#176b4d] hover:bg-[#f2f8f5] hover:text-[#176b4d]`;
export const BOTAO_PERIGO = `${BOTAO} bg-rose-700 text-white hover:bg-rose-800`;
export const BOTAO_PERIGO_LEVE = `${BOTAO} border border-rose-200 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50`;

export const CARTAO = 'rounded-2xl border border-[#d5ddd8] bg-white shadow-[0_1px_2px_rgba(11,27,22,0.05)]';

export const CAMPO = `min-h-11 lg:min-h-9 w-full rounded-lg border border-[#d5ddd8] bg-white px-3 text-base text-[#10211c] placeholder:text-[#6b7d75] transition duration-150 focus:border-[#176b4d] focus:ring-4 focus:ring-emerald-600/10 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 sm:text-[13px] ${FOCO}`;

export const CAMPO_SELECT = `${CAMPO} cursor-pointer`;

export const ROTULO = 'text-[13px] font-semibold text-[#23332d]';

export const TOM_SITUACAO = {
  ok: 'bg-[#e8f5ee] text-[#145c43] ring-1 ring-inset ring-[#cce6d8]',
  alerta: 'bg-[#fff4e8] text-[#b45309] ring-1 ring-inset ring-[#f4d5b6]',
  inativo: 'bg-[#eef2ef] text-[#54645c] ring-1 ring-inset ring-[#d5ddd8]',
} as const;

export { reduzMovimento } from '../../shared/motion/reduzMovimento';

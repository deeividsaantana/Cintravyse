import type { ReactNode } from 'react';
import { cn } from './styles';

export type TomIndicador = 'neutro' | 'verde' | 'laranja' | 'vermelho';

type AtributosData = { [chave: `data-${string}`]: string | boolean | undefined };

interface CartaoIndicadorProps {
  rotulo: string;
  valor: ReactNode;
  /** Uma linha curta embaixo do número: de onde ele vem ou o que fazer. */
  detalhe?: ReactNode;
  /** Cor do número. Verde = bom, laranja = atenção, vermelho = problema. */
  tom?: TomIndicador;
  /** Torna o cartão um botão que leva ao detalhe do número. */
  onClick?: () => void;
  /** Rótulo para o leitor de tela quando o cartão é botão. */
  ariaLabel?: string;
  className?: string;
  /** Atributos data-* da tela (entrada do GSAP, testes). */
  dados?: AtributosData;
}

const COR_DO_VALOR: Record<TomIndicador, string> = {
  neutro: 'text-[#10211c]',
  verde: 'text-[#176b4d]',
  laranja: 'text-[#c2410c]',
  vermelho: 'text-rose-700',
};

const FILETE_DO_TOM: Record<TomIndicador, string> = {
  neutro: 'border-l-[#0d261e]',
  verde: 'border-l-[#176b4d]',
  laranja: 'border-l-[#d97706]',
  vermelho: 'border-l-[#dc2626]',
};

/**
 * Cartão de indicador Pedra & Floresta: filete lateral semântico, rótulo
 * discreto, número tabular compacto e detalhe em uma linha. Mesma gramática
 * visual do Painel em todas as abas operacionais.
 */
export function CartaoIndicador({ rotulo, valor, detalhe, tom = 'neutro', onClick, ariaLabel, className, dados }: CartaoIndicadorProps) {
  const conteudo = (
    <>
      <span className="block min-w-0 text-[12px] font-medium leading-snug text-[#54645c] [overflow-wrap:anywhere]">{rotulo}</span>
      <strong className={cn('mt-1 block text-[1.375rem] font-semibold leading-none tracking-[-0.02em] tabular-nums', COR_DO_VALOR[tom])}>{valor}</strong>
      {detalhe && <span className="mt-1 block text-xs text-[#54645c]">{detalhe}</span>}
    </>
  );
  const classe = cn(
    'renea-indicador block min-w-0 rounded-xl border border-[#d5ddd8] border-l-[3px] bg-white px-3.5 py-2.5 text-left shadow-[0_1px_2px_rgba(11,27,22,0.05)]',
    FILETE_DO_TOM[tom],
    className,
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...dados}
      className={cn(classe, 'w-full cursor-pointer transition-colors duration-150 hover:bg-[#f2f8f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)')}
    >
      {conteudo}
    </button>
  ) : (
    <div {...dados} className={classe}>{conteudo}</div>
  );
}

/** Faixa dos números: dois por linha no celular, quatro no computador, numa peça só. */
export function GradeIndicadores({ children, rotulo, className, colunas = 4 }: { children: ReactNode; rotulo?: string; className?: string; colunas?: 3 | 4 }) {
  return (
    <section aria-label={rotulo} className={cn('renea-faixa-numeros grid-cols-2', colunas === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4', className)}>
      {children}
    </section>
  );
}

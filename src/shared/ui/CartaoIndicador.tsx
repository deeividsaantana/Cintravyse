import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './styles';

export type TomIndicador = 'neutro' | 'verde' | 'laranja' | 'vermelho';

type AtributosData = { [chave: `data-${string}`]: string | boolean | undefined };

interface CartaoIndicadorProps {
  rotulo: string;
  valor: ReactNode;
  /** Uma linha curta embaixo do número: de onde ele vem ou o que fazer. */
  detalhe?: ReactNode;
  icone?: LucideIcon;
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
  neutro: 'text-slate-900',
  verde: 'text-[#176b4d]',
  laranja: 'text-[#c2410c]',
  vermelho: 'text-rose-700',
};

/**
 * Número do topo das abas (redesenho de 25/11/2026): rótulo pequeno, ícone
 * discreto sem fundo colorido, número e uma linha de detalhe. Dentro de uma
 * faixa (`renea-faixa-numeros`) os números viram uma peça só, com linhas
 * finas entre eles, como num app premium.
 * Toda aba usa este cartão, para o mesmo tipo de informação ter a mesma cara
 * em qualquer tela.
 */
export function CartaoIndicador({ rotulo, valor, detalhe, icone: Icone, tom = 'neutro', onClick, ariaLabel, className, dados }: CartaoIndicadorProps) {
  const conteudo = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-[13px] font-semibold leading-snug text-[#5b6870] [overflow-wrap:anywhere]">{rotulo}</span>
        {Icone && <Icone className="size-4 shrink-0 text-slate-500" aria-hidden="true" />}
      </span>
      <strong className={cn('mt-1.5 block text-2xl sm:text-[1.75rem] font-bold leading-none tracking-tight tabular-nums', COR_DO_VALOR[tom])}>{valor}</strong>
      {detalhe && <span className="mt-1.5 block text-xs text-[#5b6870]">{detalhe}</span>}
    </>
  );
  const classe = cn('renea-indicador block min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left', className);
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      {...dados}
      className={cn(classe, 'w-full cursor-pointer transition duration-200 hover:border-emerald-300 hover:shadow-sm active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)')}
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

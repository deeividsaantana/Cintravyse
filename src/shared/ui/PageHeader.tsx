import type { ReactNode } from 'react';
import { cn } from './styles';
import { useDentroDaTelaCheia } from './TelaCheia';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Subtelas (AbasDaTela), logo depois do título e antes das ações. */
  abas?: ReactNode;
  className?: string;
  /** Mantido por compatibilidade com telas antigas; não é exibido no cabeçalho. */
  eyebrow?: string;
  /** Mantido por compatibilidade: marca o cabeçalho que tem subtelas. */
  compact?: boolean;
}

/**
 * Cabeçalho de tela no padrão Cintravyse (aprovado em 25/11/2026): na
 * primeira linha o título da tela e, encostada à direita, a ação principal
 * (um botão verde só) com as ações secundárias; na segunda linha as subtelas
 * (AbasDaTela) sublinhadas. É a mesma faixa em todas as abas, sempre dentro
 * da própria tela: a barra do topo mostra só o caminho e o salvamento.
 * Dentro da área de dados de outra TelaCheia (subtela que é uma tela
 * inteira) o título vira h2.
 */
export function PageHeader({ title, description, actions, abas, className, compact = true }: PageHeaderProps) {
  const Titulo = useDentroDaTelaCheia() ? 'h2' : 'h1';
  return (
    <header className={cn('renea-page-header', compact && abas ? 'renea-page-header--compact' : undefined, abas ? 'renea-page-header--com-abas' : undefined, className)}>
      <div className="renea-page-header__linha">
        <div className="renea-page-header__copy">
          <span>
            <Titulo>{title}</Titulo>
            {description && <p>{description}</p>}
          </span>
        </div>
        {actions && <div className="renea-page-toolbar renea-page-actions">{actions}</div>}
      </div>
      {abas && <div className="renea-page-header__abas">{abas}</div>}
    </header>
  );
}

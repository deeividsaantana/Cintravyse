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
 * Cabeçalho de tela no padrão Cintravyse. Desde 25/11/2026 (pedido do
 * Deivid: "título gigante de cada aba, não tem necessidade, tá duplicado")
 * o nome da tela não aparece de novo aqui: quem mostra onde a pessoa está é
 * o caminho na barra do topo (DesktopTopBar) e o item marcado no menu. O
 * título fica só para o leitor de tela. Numa linha só: as subtelas
 * (AbasDaTela) sublinhadas à esquerda e as ações encostadas à direita.
 * Sem subtelas e sem ações, o cabeçalho não ocupa espaço.
 * Dentro da área de dados de outra TelaCheia o título vira h2.
 */
export function PageHeader({ title, description, actions, abas, className, compact = true }: PageHeaderProps) {
  const Titulo = useDentroDaTelaCheia() ? 'h2' : 'h1';
  const vazio = !actions && !abas;
  return (
    <header className={cn('renea-page-header', compact && abas ? 'renea-page-header--compact' : undefined, abas ? 'renea-page-header--com-abas' : undefined, vazio ? 'renea-page-header--vazio' : undefined, className)}>
      <div className="renea-page-header__linha">
        <div className="renea-page-header__copy">
          <Titulo className="renea-page-header__titulo">{title}</Titulo>
          {description && <p className="renea-page-header__titulo">{description}</p>}
        </div>
        {abas && <div className="renea-page-header__abas">{abas}</div>}
        {actions && <div className="renea-page-toolbar renea-page-actions">{actions}</div>}
      </div>
    </header>
  );
}

import { LayoutDashboard, Menu, ShoppingCart, Truck, Users, type LucideIcon } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  allowedTabs: readonly string[];
  onNavigate: (tab: string) => void;
  onAbrirMenu: () => void;
  menuAberto: boolean;
}

const ATALHOS: Array<{ tab: string; rotulo: string; icone: LucideIcon }> = [
  { tab: 'dashboard', rotulo: 'Início', icone: LayoutDashboard },
  { tab: 'controle-equipamentos', rotulo: 'Frotas', icone: Truck },
  { tab: 'solicitacoes', rotulo: 'Compras', icone: ShoppingCart },
  { tab: 'presenca', rotulo: 'Pessoas', icone: Users },
];

/**
 * Barra de atalhos do celular no padrão Cintravyse (25/11/2026): as telas
 * mais usadas a um toque, como num aplicativo, e "Menu" abre a lista
 * completa. Só aparece abaixo de 1024 px; cada atalho só entra se a pessoa
 * tem acesso àquela aba.
 */
export function MobileBottomNav({ activeTab, allowedTabs, onNavigate, onAbrirMenu, menuAberto }: MobileBottomNavProps) {
  const atalhos = ATALHOS.filter(atalho => allowedTabs.includes(atalho.tab));
  return (
    <nav className="erp-barra-celular lg:hidden print:hidden" aria-label="Atalhos">
      {atalhos.map(({ tab, rotulo, icone: Icone }) => {
        const ativo = activeTab === tab && !menuAberto;
        return (
          <button key={tab} type="button" onClick={() => onNavigate(tab)} aria-current={ativo ? 'page' : undefined} data-ativo={ativo || undefined}>
            <Icone aria-hidden="true" strokeWidth={1.75} />
            {rotulo}
          </button>
        );
      })}
      <button type="button" onClick={onAbrirMenu} aria-expanded={menuAberto} data-ativo={menuAberto || undefined}>
        <Menu aria-hidden="true" strokeWidth={1.75} />
        Menu
      </button>
    </nav>
  );
}

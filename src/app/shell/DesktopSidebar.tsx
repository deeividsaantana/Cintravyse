import { useState } from 'react';
import { ChevronsLeft, ChevronsRight, LogOut, Search } from 'lucide-react';
import { Avatar } from '../../shared/ui/Avatar';
import type { NavigationGroupView } from './NavigationMenu';
import { CartaoAmbiente, MarcaProduto, SimboloProduto } from '../../shared/ui/MarcaProduto';
import { APP_VERSION_LABEL } from '../version';
import { FOCO } from '../../components/cadastros/estilos';

interface DesktopSidebarProps {
  activeTab: string;
  groups: NavigationGroupView[];
  onNavigate: (tab: string) => void;
  /** Quem entrou: aparece no rodapé do menu, com o botão de sair. */
  pessoa?: { nome: string; foto?: string | null; cor?: string | null; papel?: string };
  onAbrirPerfil?: () => void;
  onSair?: () => void;
  /** Abre a pesquisa geral (a mesma do Ctrl K). */
  onPesquisar?: () => void;
}

const COLLAPSE_KEY = 'renea_sidebar_recolhido';
const ICON_STROKE = 1.75;

const readCollapsed = () => {
  try {
    const guardado = localStorage.getItem(COLLAPSE_KEY);
    if (guardado !== null) return guardado === 'true';
  } catch {
    // Navegador com armazenamento bloqueado segue a largura da tela, sem quebrar.
  }
  // Sem escolha guardada, notebook pequeno e tablet deitado (abaixo de 1280 px)
  // abrem com o menu só de ícones, para a tabela ganhar espaço. Quem expandir
  // uma vez fica com o menu aberto, porque a escolha passa a ser guardada.
  return typeof window !== 'undefined' && window.innerWidth < 1280;
};

/**
 * Menu lateral do computador (redesenho de 11/11/2026, pedido do Deivid:
 * "deixar profissional"). Fundo branco como o resto do sistema, grupos
 * sempre abertos com o nome discreto (sem setas para abrir e fechar), item
 * aberto em verde-claro com a barrinha verde à esquerda, e o ambiente do
 * cliente num cartão compacto logo abaixo da marca. O projeto também aparece
 * na barra superior.
 */
export function DesktopSidebar({ activeTab, groups, onNavigate, pessoa, onAbrirPerfil, onSair, onPesquisar }: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  
  // Só grava quando a pessoa aperta o botão: o padrão pela largura da tela
  // não vira escolha guardada.
  const mudarRecolhido = (valor: boolean) => {
    setCollapsed(valor);
    try {
      localStorage.setItem(COLLAPSE_KEY, String(valor));
    } catch {
      // Preferência de layout não vale interromper a navegação.
    }
  };

  const versao = APP_VERSION_LABEL.split(' — ')[0];

  return (
    <aside
      className={`erp-sidebar hidden shrink-0 flex-col lg:flex ${collapsed ? 'erp-sidebar--recolhido' : ''}`}
      aria-label="Navegação principal"
    >
      <div className={`flex min-h-[3.25rem] items-center border-b border-slate-200 ${collapsed ? 'justify-center px-2' : 'justify-between pl-4 pr-2'}`}>
        {collapsed ? <SimboloProduto className="size-8" /> : <MarcaProduto />}
        {!collapsed && (
          <button
            type="button"
            onClick={() => mudarRecolhido(true)}
            title="Recolher menu"
            aria-label="Recolher menu"
            className={`grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${FOCO}`}
          >
            <ChevronsLeft className="size-4" strokeWidth={ICON_STROKE} />
          </button>
        )}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => mudarRecolhido(false)}
          title="Expandir menu"
          aria-label="Expandir menu"
          className={`mx-auto mt-2 grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${FOCO}`}
        >
          <ChevronsRight className="size-4" strokeWidth={ICON_STROKE} />
        </button>
      ) : (
        <div className="space-y-2 px-2.5 pt-2.5">
          <CartaoAmbiente />
          {onPesquisar && (
            <button type="button" onClick={onPesquisar} className={`flex h-8 w-full items-center gap-2 rounded-md border border-[#e6e8eb] bg-white px-2.5 text-[0.8125rem] text-slate-500 hover:border-slate-300 ${FOCO}`}>
              <Search className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
              Buscar ou ir para…
              <kbd className="ml-auto rounded border border-[#e6e8eb] px-1 font-sans text-xs text-slate-500">Ctrl K</kbd>
            </button>
          )}
        </div>
      )}

      <nav className={`flex-1 overflow-y-auto pb-3 pt-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {groups.map((group, index) => (
          <section key={group.label} aria-label={group.label} className={index > 0 && collapsed ? 'mt-2 border-t border-slate-100 pt-2' : ''}>
            {!collapsed && (
              <p className="px-2.5 pb-1 pt-3.5 text-xs font-medium text-slate-500">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    data-sidebar-item
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    className={`erp-sidebar__item relative flex w-full items-center gap-2.5 rounded-md text-left text-[0.8125rem] font-medium ${FOCO} ${
                      active ? 'erp-sidebar__item--ativo text-slate-950' : 'text-slate-700 hover:bg-[#eef0f2] hover:text-slate-950'
                    } ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? 'text-[#176b4d]' : 'text-slate-500'}`} strokeWidth={ICON_STROKE} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {groups.length === 0 && !collapsed && (
          <p className="px-2.5 pt-4 text-sm text-slate-500">Nenhum módulo encontrado.</p>
        )}
      </nav>

      <div className={`flex items-center gap-2 border-t border-slate-200 py-2 ${collapsed ? 'flex-col px-2' : 'px-3'}`} title={APP_VERSION_LABEL}>
        {pessoa && (
          <button type="button" onClick={onAbrirPerfil} title="Meu perfil: trocar nome e foto" className={`flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-[#eef0f2] ${FOCO}`}>
            <Avatar nome={pessoa.nome} foto={pessoa.foto ?? undefined} cor={pessoa.cor ?? undefined} />
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <strong className="block truncate text-[0.8125rem] font-semibold text-slate-900">{pessoa.nome}</strong>
                <span className="block truncate text-xs text-slate-500">{pessoa.papel ? `${pessoa.papel} · ` : ''}{versao.replace(/^ERP\s*/, '')}</span>
              </span>
            )}
          </button>
        )}
        {onSair && (
          <button type="button" onClick={onSair} title="Sair da conta" aria-label="Sair da conta" className={`grid size-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-[#eef0f2] hover:text-slate-900 ${FOCO}`}>
            <LogOut className="size-4" strokeWidth={ICON_STROKE} />
          </button>
        )}
        {!pessoa && !onSair && <span className="text-xs text-slate-500">{versao.replace(/^ERP\s*/, '')}</span>}
      </div>
    </aside>
  );
}

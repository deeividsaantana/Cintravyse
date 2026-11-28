import { Building2, Search } from 'lucide-react';
import { descreverSalvamento, type DescricaoSalvamento } from '../../cloud/estadoSalvamento';
import { OBRA } from '../../config/obra';
import { SIDEBAR_NAVIGATION_GROUPS } from '../navigation/navigation';

interface DesktopTopBarProps {
  /** Aba aberta: vira o caminho "Grupo / Tela" à esquerda. */
  activeTab: string;
  isCloudConnected: boolean;
  /** Estado do salvamento (aparelho e nuvem). Sem ele, usa só isCloudConnected. */
  salvamento?: DescricaoSalvamento;
  onRetryUpload?: () => void;
  lastCloudSync: string;
  pendingCount?: number;
  isRetryingPending?: boolean;
  onRetryPending?: () => void;
  /** Abre a paleta global de busca (Ctrl K). */
  onPesquisar?: () => void;
}

/** Grupo e nome da aba no menu, para o caminho do topo. */
export function trilhaDaAba(activeTab: string) {
  for (const grupo of SIDEBAR_NAVIGATION_GROUPS) {
    const item = grupo.items.find(i => i.id === activeTab);
    if (item) return { grupo: grupo.label === item.label ? '' : grupo.label, tela: item.label };
  }
  return { grupo: '', tela: '' };
}

/**
 * Barra superior Pedra & Floresta: trilha do módulo + obra ativa à esquerda,
 * busca global (Ctrl K) e estado de sincronização à direita.
 */
export function DesktopTopBar({
  activeTab,
  isCloudConnected,
  salvamento: salvamentoRecebido,
  onRetryUpload,
  lastCloudSync,
  pendingCount,
  isRetryingPending,
  onRetryPending,
  onPesquisar,
}: DesktopTopBarProps) {
  const salvamento = salvamentoRecebido ?? descreverSalvamento({ online: true, conectado: isCloudConnected, enviando: false, pendente: false, falhasSeguidas: 0 });
  const { grupo, tela } = trilhaDaAba(activeTab);
  const mostrarStatus = activeTab === 'dev' || salvamento.ponto !== 'verde' || salvamento.tentarNovamente;

  return (
    <header className="erp-topbar hidden lg:flex" aria-label="Barra de contexto do sistema">
      <div className="flex min-w-0 items-center gap-3">
        <nav aria-label="Trilha de navegação" className="erp-topbar__trilha">
          {grupo && <><span>{grupo}</span><span aria-hidden="true">/</span></>}
          <strong aria-current="page">{tela}</strong>
        </nav>
        <span className="hidden items-center gap-1.5 rounded-md border border-[#d5ddd8] bg-[#f4f7f5] px-2 py-0.5 text-xs font-medium text-[#33413b] xl:inline-flex">
          <Building2 className="size-3.5 text-[#176b4d]" aria-hidden="true" />
          {OBRA.nomeCurto}
        </span>
      </div>

      <div className="erp-topbar__actions">
        {onPesquisar && (
          <button
            type="button"
            onClick={onPesquisar}
            className="hidden h-7 items-center gap-2 rounded-lg border border-[#d5ddd8] bg-[#f4f7f5] px-2.5 text-xs font-medium text-[#54645c] transition-colors hover:border-[#176b4d] hover:bg-white hover:text-[#10211c] md:inline-flex"
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span>Buscar no ERP…</span>
            <kbd className="rounded border border-[#d5ddd8] bg-white px-1 font-sans text-xs text-[#54645c]">Ctrl K</kbd>
          </button>
        )}
        {mostrarStatus && (
          <div
            className="erp-topbar__status"
            role="status"
            aria-live="polite"
            data-offline={salvamento.ponto === 'amarelo' || undefined}
            title={`${salvamento.detalhe} ${lastCloudSync ? `Última sincronização: ${lastCloudSync}` : 'Ainda sem sincronização nesta sessão.'}`}
          >
            <span aria-hidden="true" />
            <em className="not-italic">{salvamento.estado === 'sincronizado' ? 'Tudo salvo' : salvamento.curto}</em>
          </div>
        )}
        {salvamento.tentarNovamente && onRetryUpload && (
          <button type="button" className="erp-topbar__retry" onClick={onRetryUpload}>Tentar novamente</button>
        )}
        {typeof pendingCount === 'number' && pendingCount > 0 && (
          <div className="erp-topbar__pending" title={`${pendingCount} pendência(s) offline aguardando envio`}>
            <span aria-live="polite">Pendente: {pendingCount}</span>
            {onRetryPending && (
              <button type="button" onClick={onRetryPending} disabled={isRetryingPending} aria-label="Tentar enviar pendências agora">
                {isRetryingPending ? 'Enviando…' : 'Tentar agora'}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

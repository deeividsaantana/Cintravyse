import { descreverSalvamento, type DescricaoSalvamento } from '../../cloud/estadoSalvamento';
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
 * Barra do topo no padrão Cintravyse (25/11/2026): uma faixa fina com o
 * caminho da tela (Grupo / Tela) e, à direita, se está tudo salvo. Quem
 * entrou e o botão de sair moram no rodapé do menu lateral. O título, as
 * subtelas e a ação principal ficam no cabeçalho da própria tela.
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
}: DesktopTopBarProps) {
  const salvamento = salvamentoRecebido ?? descreverSalvamento({ online: true, conectado: isCloudConnected, enviando: false, pendente: false, falhasSeguidas: 0 });
  const { grupo, tela } = trilhaDaAba(activeTab);

  return (
    <header className="erp-topbar hidden lg:flex" aria-label="Barra de contexto do sistema">
      <nav aria-label="Trilha de navegação" className="erp-topbar__trilha">
        {grupo && <><span>{grupo}</span><span aria-hidden="true">/</span></>}
        <strong aria-current="page">{tela}</strong>
      </nav>

      <div className="erp-topbar__actions">
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

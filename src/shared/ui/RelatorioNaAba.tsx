import { ChevronLeft } from 'lucide-react';

/**
 * Relatório aberto pela guia Relatórios (pedido do Deivid em 25/11/2026:
 * "só essa aba é responsável por gerar o relatório"). A tela do módulo
 * recebe isto, mostra só a parte do relatório, com os filtros e os botões
 * de PDF e Excel dela, e troca as subtelas pelo caminho de volta.
 */
export interface ModoRelatorio {
  nome: string;
  onVoltar: () => void;
}

/** "‹ Relatórios / Nome do relatório", no lugar das subtelas do módulo. */
export function VoltarAosRelatorios({ relatorio }: { relatorio: ModoRelatorio }) {
  return (
    <nav className="cv-voltar-relatorios" aria-label="Relatório aberto">
      <button type="button" onClick={relatorio.onVoltar}><ChevronLeft aria-hidden="true" />Relatórios</button>
      <span aria-hidden="true">/</span>
      <strong>{relatorio.nome}</strong>
    </nav>
  );
}

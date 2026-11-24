import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BOTAO_SECUNDARIO, FOCO } from '../cadastros/estilos';
import type { VistaFrotaManutencao } from './abasFrotaManutencao';

/**
 * Lançamentos não tem escolha de tela: a lista do dia é a tela, e quem falta
 * aparece numa faixa com o botão "Ver quem falta". Lá dentro, um "Voltar".
 */
export function AtalhoFaltando({ vista, maquinas, operadores, onTrocar }: {
  vista: VistaFrotaManutencao;
  maquinas: number;
  operadores: number;
  onTrocar: (vista: VistaFrotaManutencao) => void;
}) {
  if (vista === 'faltando') {
    return (
      <button type="button" onClick={() => onTrocar('dia')} className={`${BOTAO_SECUNDARIO} w-fit`} data-testid="frota-voltar-lancados">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar aos lançados
      </button>
    );
  }
  if (vista !== 'dia') return null;
  const partes = [
    maquinas ? `${maquinas} ${maquinas === 1 ? 'máquina' : 'máquinas'}` : '',
    operadores ? `${operadores} ${operadores === 1 ? 'operador' : 'operadores'}` : '',
  ].filter(Boolean);
  if (!partes.length) {
    return (
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-800" data-testid="frota-faltando-resumo">
        <CheckCircle2 className="size-4" aria-hidden="true" /> Todas as máquinas e operadores da lista foram lançados.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="frota-faltando-resumo">
      <span className="flex-1"><strong>Falta lançar:</strong> {partes.join(' e ')}</span>
      <button type="button" onClick={() => onTrocar('faltando')} data-testid="frota-ver-faltando"
        className={`inline-flex min-h-11 items-center rounded-lg bg-[#176b4d] px-3 font-bold text-white hover:brightness-95 lg:min-h-9 ${FOCO}`}>
        Ver quem falta
      </button>
    </div>
  );
}

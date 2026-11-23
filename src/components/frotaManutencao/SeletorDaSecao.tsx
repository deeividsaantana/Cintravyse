import { FOCO } from '../cadastros/estilos';
import type { OpcaoDaSecao, VistaFrotaManutencao } from './abasFrotaManutencao';

/**
 * Escolha da tela dentro de uma seção (Lançados / Faltando, Paradas de hoje /
 * Ordens de serviço / Conferir 10 h...): botões lado a lado no começo da
 * tela, no lugar da segunda linha de abas do topo. Número só quando pede
 * atenção.
 */
export function SeletorDaSecao({ opcoes, ativa, onTrocar, rotulo }: {
  opcoes: readonly OpcaoDaSecao[];
  ativa: VistaFrotaManutencao;
  onTrocar: (vista: VistaFrotaManutencao) => void;
  rotulo: string;
}) {
  if (opcoes.length < 2) return null;
  return (
    <div role="group" aria-label={rotulo} data-testid="frota-seletor"
      className="flex w-full gap-1 overflow-x-auto rounded-xl bg-[#f7f8f6] p-1 ring-1 ring-inset ring-slate-200 sm:w-fit">
      {opcoes.map(opcao => {
        const escolhida = opcao.id === ativa;
        return (
          <button key={opcao.id} type="button" aria-pressed={escolhida} onClick={() => onTrocar(opcao.id)} data-testid={`frota-seletor-${opcao.id}`}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors sm:flex-none lg:min-h-9 ${escolhida ? 'bg-white text-[#176b4d] shadow-sm ring-1 ring-slate-200' : 'text-[#5b6870] hover:text-slate-900'} ${FOCO}`}>
            {opcao.curto ? <><span className="max-sm:hidden">{opcao.rotulo}</span><span className="sm:hidden">{opcao.curto}</span></> : opcao.rotulo}
            {Boolean(opcao.contador) && <span className="rounded-full bg-[#c2410c] px-1.5 text-xs font-bold tabular-nums text-white">{opcao.contador}</span>}
          </button>
        );
      })}
    </div>
  );
}

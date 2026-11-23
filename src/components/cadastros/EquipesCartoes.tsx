import { MapPin, Users } from 'lucide-react';
import type { GrupoEquipe } from '../../types';
import type { DadosCadastros, LinhaCadastro } from '../../utils/cadastrosLista';
import { chaveDoCargo, mapaDeCargos } from '../../utils/hierarquia';
import { Avatar, FilaDeRostos } from './pessoasVisual';
import { FOCO, TOM_SITUACAO } from './estilos';

interface Props {
  linhas: LinhaCadastro[];
  dados: DadosCadastros;
  selecionadoId: string | null;
  onAbrir: (linha: LinhaCadastro) => void;
  vazio: React.ReactNode;
}

/**
 * Equipes em cartões (redesenho de 23/11/2026): cada equipe mostra de cara o
 * encarregado, a frente, os rostos de quem faz parte e se está ativa. Tocar
 * no cartão abre a ficha da equipe em tela cheia.
 */
export default function EquipesCartoes({ linhas, dados, selecionadoId, onAbrir, vazio }: Props) {
  if (linhas.length === 0) return <>{vazio}</>;
  const porId = new Map(dados.funcionarios.map(item => [item.id, item]));
  const porMatricula = new Map(dados.funcionarios.filter(item => item.matricula).map(item => [item.matricula as string, item]));
  const cargos = mapaDeCargos(dados.cargos);
  const nivelDe = (cargo?: string) => cargos.get(chaveDoCargo(cargo))?.nivel ?? null;

  return (
    <ul aria-label="Equipes" data-testid="equipes-cartoes" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {linhas.map(linha => {
        const equipe = linha.registro as GrupoEquipe;
        const membros = equipe.funcionarioIds.map(id => porId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
        const encarregado = equipe.liderMatricula ? porMatricula.get(equipe.liderMatricula) : undefined;
        const escolhido = selecionadoId === linha.id;
        return (
          <li key={linha.id}>
            <button
              type="button"
              onClick={() => onAbrir(linha)}
              data-testid="equipe-cartao"
              className={`flex h-full w-full flex-col gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-emerald-300 hover:shadow-md ${FOCO} ${escolhido ? 'border-[#176b4d] ring-2 ring-[#176b4d]/25' : 'border-slate-200'} ${linha.ativo ? '' : 'opacity-70'}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <strong className="block truncate text-lg text-slate-900">{equipe.nome}</strong>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate">{equipe.frenteServico || 'Sem frente de serviço'}</span>
                  </span>
                </span>
                <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${TOM_SITUACAO[linha.tom]}`}>{linha.situacao}</span>
              </span>

              <span className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Avatar nome={equipe.responsavel || '?'} nivel={nivelDe(encarregado?.cargo)} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-500">Encarregado</span>
                  <span className="block truncate text-sm font-bold text-slate-900">{equipe.responsavel || 'Sem encarregado'}</span>
                </span>
              </span>

              <span className="mt-auto flex items-center justify-between gap-2">
                {membros.length > 0
                  ? <FilaDeRostos nomes={membros.slice(0, 4).map(item => item.nome)} total={membros.length} />
                  : <span className="inline-flex items-center gap-2 text-sm text-slate-600"><Users className="size-4" aria-hidden="true" />Ninguém na equipe</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

import { BadgeCheck, Building2, ClipboardList, Construction, Droplets, Fuel, GitBranch, HardHat, MapPin, Network, Route, Tent, Triangle, Truck, UsersRound, Users, type LucideIcon } from 'lucide-react';
import type { ItemDasAbas } from '../../shared/ui/AbasDaTela';
import { CADASTRO_GRUPOS, categoriasDoGrupo, type CadastroCategoriaId, type CadastroGrupoId } from '../../utils/cadastrosCategorias';

/** Visões montadas na hora a partir de Colaboradores, Cargos e Equipes (22/11/2026). */
export type VistaEstrutura = 'organograma' | 'piramide';

/** Subtela aberta na aba Cadastros: um tipo de cadastro, uma visão, a Lixeira ou uma parte do administrador. */
export type VistaCadastros = CadastroCategoriaId | 'lixeira' | VistaEstrutura;

export const ehVistaEstrutura = (vista: VistaCadastros): vista is VistaEstrutura => vista === 'organograma' || vista === 'piramide';

const ICONE_DO_GRUPO: Record<CadastroGrupoId, LucideIcon> = {
  pessoas: Users,
  empresas: Building2,
  frota: Truck,
  obra: MapPin,
};

const ICONE_DO_TIPO: Record<CadastroCategoriaId, LucideIcon> = {
  funcionarios: Users,
  cargos: BadgeCheck,
  equipes: UsersRound,
  empresas: Building2,
  terceiras: HardHat,
  fornecedores: Building2,
  'fornecedores-locacao': Construction,
  subfornecedores: GitBranch,
  equipamentos: Truck,
  veiculos: Truck,
  comboios: Fuel,
  canteiros: Tent,
  obras: MapPin,
  etapas: Route,
  frentes: HardHat,
  servicos: ClipboardList,
  combustiveis: Fuel,
  lubrificantes: Droplets,
};

/** Nome curto do grupo no celular, para a primeira linha caber sem apertar. */
const CURTO_DO_GRUPO: Partial<Record<CadastroGrupoId, string>> = {};

/**
 * Subtelas de Cadastros como abas no topo (AbasDaTela), na ordem e nos grupos
 * de cadastrosCategorias: Pessoas, Empresas, Frota e insumos e Obra. Cada aba
 * mostra quantos cadastros ativos o tipo tem (selo neutro).
 *
 * Pessoas junta tudo que monta a estrutura da empresa: Colaboradores, Cargos,
 * Equipes, e as visões Organograma e Pirâmide. Padrão do site (23/11/2026):
 * quatro opções no topo e a tela de cada uma na caixinha "Ver". Acessos mora
 * só no Dev e o Link de presença na Presença. A Lixeira fica em "Mais ações".
 */
export const abasCadastros = (
  contar: (vista: VistaCadastros) => number,
): ItemDasAbas<VistaCadastros>[] => CADASTRO_GRUPOS.map(grupo => ({
  grupo: grupo.id,
  rotulo: grupo.label,
  curto: CURTO_DO_GRUPO[grupo.id],
  icone: ICONE_DO_GRUPO[grupo.id],
  abas: [
    ...categoriasDoGrupo(grupo.id).map(categoria => ({
      id: categoria.id,
      rotulo: categoria.label,
      icone: ICONE_DO_TIPO[categoria.id],
      contador: contar(categoria.id),
      contadorRotulo: 'ativos',
      tom: 'neutro' as const,
      testId: `cadastro-categoria-${categoria.id}`,
    })),
    ...(grupo.id === 'pessoas' ? [
      { id: 'organograma' as const, rotulo: 'Organograma', icone: Network, testId: 'cadastro-categoria-organograma' },
      { id: 'piramide' as const, rotulo: 'Pirâmide', icone: Triangle, testId: 'cadastro-categoria-piramide' },
    ] : []),
  ],
}));

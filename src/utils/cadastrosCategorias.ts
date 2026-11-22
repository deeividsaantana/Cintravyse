/**
 * Tipos de cadastro mestre e o agrupamento que a aba Cadastros mostra.
 *
 * A ordem aqui é a ordem da tela: quem abre a aba procura primeiro gente,
 * depois empresas, máquina e insumos, e obra. Quatro grupos só, para a aba
 * ter poucas opções no topo (10/11/2026). Pessoas reúne tudo que monta o
 * organograma e a pirâmide: colaboradores, cargos e equipes (22/11/2026). O texto do botão principal mora junto de
 * cada tipo para não virar "Novo registro" genérico, que obriga a pessoa a
 * conferir em qual sub-aba está antes de clicar.
 */
export type CadastroCategoriaId =
  | 'funcionarios'
  | 'cargos'
  | 'equipes'
  | 'empresas'
  | 'fornecedores'
  | 'fornecedores-locacao'
  | 'subfornecedores'
  | 'terceiras'
  | 'equipamentos'
  | 'veiculos'
  | 'comboios'
  | 'obras'
  | 'etapas'
  | 'frentes'
  | 'servicos'
  | 'combustiveis'
  | 'lubrificantes'
  | 'canteiros';

export type CadastroGrupoId = 'pessoas' | 'empresas' | 'frota' | 'obra';

export interface CadastroCategoria {
  id: CadastroCategoriaId;
  grupo: CadastroGrupoId;
  label: string;
  acaoNovo: string;
}

export const CADASTRO_GRUPOS: readonly { id: CadastroGrupoId; label: string }[] = [
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'frota', label: 'Frota e insumos' },
  { id: 'obra', label: 'Obra' },
];

export const CADASTRO_CATEGORIAS: readonly CadastroCategoria[] = [
  { id: 'funcionarios', grupo: 'pessoas', label: 'Colaboradores', acaoNovo: 'Novo colaborador' },
  { id: 'cargos', grupo: 'pessoas', label: 'Cargos', acaoNovo: 'Novo cargo' },
  { id: 'equipes', grupo: 'pessoas', label: 'Equipes', acaoNovo: 'Nova equipe' },
  { id: 'empresas', grupo: 'empresas', label: 'Empresas', acaoNovo: 'Nova empresa' },
  { id: 'terceiras', grupo: 'empresas', label: 'Terceiras', acaoNovo: 'Nova terceira' },
  { id: 'fornecedores', grupo: 'empresas', label: 'Todos os fornecedores', acaoNovo: 'Novo fornecedor' },
  { id: 'fornecedores-locacao', grupo: 'empresas', label: 'Locação de equipamentos', acaoNovo: 'Nova locadora' },
  { id: 'subfornecedores', grupo: 'empresas', label: 'Subfornecedores', acaoNovo: 'Novo subfornecedor' },
  { id: 'equipamentos', grupo: 'frota', label: 'Equipamentos', acaoNovo: 'Novo equipamento' },
  { id: 'veiculos', grupo: 'frota', label: 'Veículos', acaoNovo: 'Novo veículo' },
  { id: 'comboios', grupo: 'frota', label: 'Comboios', acaoNovo: 'Novo comboio' },
  { id: 'canteiros', grupo: 'frota', label: 'Canteiros', acaoNovo: 'Novo canteiro' },
  { id: 'obras', grupo: 'obra', label: 'Locais', acaoNovo: 'Novo local' },
  { id: 'etapas', grupo: 'obra', label: 'Ramos e locais', acaoNovo: 'Novo ramo ou local' },
  { id: 'frentes', grupo: 'obra', label: 'Frentes de serviço', acaoNovo: 'Nova frente' },
  { id: 'servicos', grupo: 'obra', label: 'Serviços da obra', acaoNovo: 'Novo serviço' },
  { id: 'combustiveis', grupo: 'frota', label: 'Combustíveis', acaoNovo: 'Novo combustível' },
  { id: 'lubrificantes', grupo: 'frota', label: 'Lubrificantes', acaoNovo: 'Novo lubrificante' },
];

export const categoriasDoGrupo = (grupo: CadastroGrupoId) =>
  CADASTRO_CATEGORIAS.filter(categoria => categoria.grupo === grupo);

export const categoriaCadastro = (id: CadastroCategoriaId): CadastroCategoria =>
  CADASTRO_CATEGORIAS.find(categoria => categoria.id === id) ?? CADASTRO_CATEGORIAS[0];

type EmpresaCategoriaId = Extract<CadastroCategoriaId, 'empresas' | 'terceiras' | 'fornecedores' | 'fornecedores-locacao' | 'subfornecedores'>;
type EmpresaTipo = 'EMPRESA' | 'TERCEIRA' | 'FORNECEDOR' | 'LOCACAO_EQUIPAMENTOS' | 'SUBFORNECEDOR';

/** Classes com que um cadastro nasce quando é criado ou importado em cada tipo. */
export const TIPOS_POR_CATEGORIA_EMPRESA: Readonly<Record<EmpresaCategoriaId, readonly EmpresaTipo[]>> = {
  empresas: ['EMPRESA'],
  terceiras: ['TERCEIRA'],
  fornecedores: ['FORNECEDOR'],
  'fornecedores-locacao': ['FORNECEDOR', 'LOCACAO_EQUIPAMENTOS'],
  subfornecedores: ['FORNECEDOR', 'SUBFORNECEDOR'],
};

export const isCategoriaEmpresa = (id: CadastroCategoriaId): id is EmpresaCategoriaId => id in TIPOS_POR_CATEGORIA_EMPRESA;

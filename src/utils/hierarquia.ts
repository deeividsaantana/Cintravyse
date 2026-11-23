/**
 * Estrutura de pessoas da empresa, sem React: nível de cada cargo, quem
 * lidera quem, a linha de comando de uma pessoa e a pirâmide de cargos.
 *
 * Tudo sai de dois cadastros: Colaboradores (cargo e líder de cada pessoa) e
 * Cargos (o nível de cada cargo). Organograma e pirâmide não guardam nada:
 * são montados na hora, então nunca ficam diferentes do cadastro.
 */
import type { Cargo, Funcionario, GrupoEquipe, NivelCargo } from '../types';
import { isActiveCollaborator, nextMasterId } from '../masterData/centralRegistry';

export const NIVEIS: ReadonlyArray<{ nivel: NivelCargo; nome: string; explica: string }> = [
  { nivel: 1, nome: 'Diretoria', explica: 'Diretores e sócios' },
  { nivel: 2, nome: 'Gerência', explica: 'Gerentes de obra, de contrato e de área' },
  { nivel: 3, nome: 'Coordenação', explica: 'Engenheiros, coordenadores, supervisores e técnicos' },
  { nivel: 4, nome: 'Liderança de campo', explica: 'Encarregados, líderes e mestres de obra' },
  { nivel: 5, nome: 'Operacional', explica: 'Operadores, motoristas e oficiais' },
  { nivel: 6, nome: 'Apoio', explica: 'Ajudantes, serventes e auxiliares' },
];

export const nomeDoNivel = (nivel: NivelCargo | undefined) => (nivel ? `${nivel} · ${NIVEIS[nivel - 1].nome}` : 'Sem nível');

export const chaveDoCargo = (nome: string | undefined) => (nome || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

// A ordem importa: "Auxiliar de engenharia" é apoio, "Encarregado de
// operadores" é liderança. Cada regra olha o começo das palavras.
const REGRAS: ReadonlyArray<[RegExp, NivelCargo]> = [
  [/\b(diretor|presidente|socio)/, 1],
  [/\b(ajudante|servente|auxiliar|aprendiz|estagiari|vigia|vigilante|porteir|copeir|zelador|limpeza)/, 6],
  [/\b(gerente|superintendente)/, 2],
  [/\b(encarregad|lider|chefe|mestre|feitor|capataz)/, 4],
  [/\b(engenheir|coordenador|supervisor|tecnic|analista|assistente|administrativ|comprador|apontador|almoxarif|topografo|planejador)/, 3],
];

/** Nível mais provável pelo nome do cargo. A pessoa pode trocar no cadastro. */
export const nivelSugerido = (nome: string): NivelCargo => {
  const chave = chaveDoCargo(nome);
  return REGRAS.find(([regra]) => regra.test(chave))?.[1] ?? 5;
};

/** Cargo cadastrado com o mesmo nome do cargo escrito na pessoa. */
export const mapaDeCargos = (cargos: readonly Cargo[]) => new Map(cargos.map(cargo => [chaveDoCargo(cargo.nome), cargo]));

/**
 * Cargos que os colaboradores usam e ainda não estão no cadastro, com quantas
 * pessoas cada um tem. Serve para cadastrar todos de uma vez.
 */
export const cargosQueFaltam = (funcionarios: readonly Funcionario[], cargos: readonly Cargo[]) => {
  const cadastrados = mapaDeCargos(cargos);
  const faltam = new Map<string, { nome: string; pessoas: number }>();
  funcionarios.forEach(pessoa => {
    const chave = chaveDoCargo(pessoa.cargo);
    if (!chave || cadastrados.has(chave)) return;
    const atual = faltam.get(chave);
    if (atual) atual.pessoas += 1;
    else faltam.set(chave, { nome: pessoa.cargo.trim(), pessoas: 1 });
  });
  return Array.from(faltam.values()).sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, 'pt-BR'));
};

/** Monta os cargos que faltam, com o nível sugerido, prontos para gravar. */
export const novosCargos = (faltam: ReadonlyArray<{ nome: string }>, existentes: readonly Cargo[], agora = new Date().toISOString()): Cargo[] => {
  const ids = existentes.map(cargo => cargo.id);
  return faltam.map(item => {
    const id = nextMasterId('CAR', ids);
    ids.push(id);
    return { id, nome: item.nome, nivel: nivelSugerido(item.nome), ativo: true, criadoEm: agora, atualizadoEm: agora };
  });
};

/** Quantas pessoas (ativas) usam cada cargo, pelo nome. */
export const pessoasPorCargo = (funcionarios: readonly Funcionario[]) => {
  const contagem = new Map<string, number>();
  funcionarios.filter(isActiveCollaborator).forEach(pessoa => {
    const chave = chaveDoCargo(pessoa.cargo);
    if (chave) contagem.set(chave, (contagem.get(chave) || 0) + 1);
  });
  return contagem;
};

/** Equipe de cada pessoa, pelo id do colaborador. */
export const equipePorPessoa = (equipes: readonly GrupoEquipe[]) => {
  const mapa = new Map<string, GrupoEquipe>();
  equipes.filter(equipe => equipe.status !== 'inativo').forEach(equipe => equipe.funcionarioIds.forEach(id => {
    if (!mapa.has(id)) mapa.set(id, equipe);
  }));
  return mapa;
};

export interface Estrutura {
  /** Quem cada pessoa lidera, já em ordem de nível e nome. */
  liderados: Map<string, Funcionario[]>;
  /** Líder direto de cada pessoa. */
  lider: Map<string, Funcionario>;
  /** Quem não responde a ninguém do cadastro e lidera alguém: o topo. */
  topo: Funcionario[];
  /** Quem não responde a ninguém e não lidera ninguém. */
  semLider: Funcionario[];
  /** Total de pessoas abaixo de cada um (diretas e indiretas). */
  abaixo: Map<string, number>;
}

/**
 * Árvore de quem lidera quem, a partir da matrícula do líder gravada em cada
 * pessoa. Ciclos (A lidera B que lidera A) não travam: quem fecha o ciclo
 * entra no topo.
 */
export const montarEstrutura = (funcionarios: readonly Funcionario[], cargos: readonly Cargo[]): Estrutura => {
  const cadastro = mapaDeCargos(cargos);
  const nivelDe = (pessoa: Funcionario) => cadastro.get(chaveDoCargo(pessoa.cargo))?.nivel ?? 7;
  const ordenar = (a: Funcionario, b: Funcionario) => nivelDe(a) - nivelDe(b) || a.nome.localeCompare(b.nome, 'pt-BR');
  const porMatricula = new Map(funcionarios.filter(pessoa => pessoa.matricula).map(pessoa => [pessoa.matricula as string, pessoa]));
  const lider = new Map<string, Funcionario>();
  funcionarios.forEach(pessoa => {
    const chefe = pessoa.liderMatricula ? porMatricula.get(pessoa.liderMatricula) : undefined;
    if (chefe && chefe.id !== pessoa.id) lider.set(pessoa.id, chefe);
  });
  // Quebra ciclos: sobe a partir de cada um; se voltar a si mesmo, corta.
  funcionarios.forEach(pessoa => {
    const vistos = new Set<string>([pessoa.id]);
    let atual = lider.get(pessoa.id);
    while (atual) {
      if (vistos.has(atual.id)) {
        lider.delete(pessoa.id);
        break;
      }
      vistos.add(atual.id);
      atual = lider.get(atual.id);
    }
  });
  const liderados = new Map<string, Funcionario[]>();
  lider.forEach((chefe, id) => {
    const pessoa = funcionarios.find(item => item.id === id);
    if (!pessoa) return;
    const lista = liderados.get(chefe.id) || [];
    lista.push(pessoa);
    liderados.set(chefe.id, lista);
  });
  liderados.forEach(lista => lista.sort(ordenar));
  const soltos = funcionarios.filter(pessoa => !lider.has(pessoa.id));
  const abaixo = new Map<string, number>();
  const contar = (pessoa: Funcionario): number => {
    const pronto = abaixo.get(pessoa.id);
    if (pronto !== undefined) return pronto;
    const total = (liderados.get(pessoa.id) || []).reduce((soma, item) => soma + 1 + contar(item), 0);
    abaixo.set(pessoa.id, total);
    return total;
  };
  funcionarios.forEach(contar);
  return {
    liderados,
    lider,
    topo: soltos.filter(pessoa => liderados.has(pessoa.id)).sort(ordenar),
    semLider: soltos.filter(pessoa => !liderados.has(pessoa.id)).sort(ordenar),
    abaixo,
  };
};

/** De quem está no topo até a pessoa: a linha de comando dela. */
export const linhaDeComando = (pessoa: Funcionario, estrutura: Estrutura): Funcionario[] => {
  const linha: Funcionario[] = [pessoa];
  let atual = estrutura.lider.get(pessoa.id);
  while (atual) {
    linha.unshift(atual);
    atual = estrutura.lider.get(atual.id);
  }
  return linha;
};

export interface DegrauPiramide {
  nivel: NivelCargo | null;
  nome: string;
  pessoas: number;
  cargos: Array<{ nome: string; pessoas: number }>;
}

/** Pessoas ativas por nível de cargo. Quem tem cargo sem cadastro fica em "Sem nível". */
export const montarPiramide = (funcionarios: readonly Funcionario[], cargos: readonly Cargo[]): DegrauPiramide[] => {
  const cadastro = mapaDeCargos(cargos);
  const degraus = new Map<NivelCargo | null, Map<string, number>>();
  funcionarios.filter(isActiveCollaborator).forEach(pessoa => {
    const cargo = cadastro.get(chaveDoCargo(pessoa.cargo));
    const nivel = cargo?.nivel ?? null;
    const nome = cargo?.nome || pessoa.cargo?.trim() || 'Sem cargo';
    const mapa = degraus.get(nivel) || new Map<string, number>();
    mapa.set(nome, (mapa.get(nome) || 0) + 1);
    degraus.set(nivel, mapa);
  });
  const montar = (nivel: NivelCargo | null, nome: string): DegrauPiramide => {
    const mapa = degraus.get(nivel) || new Map<string, number>();
    const lista = Array.from(mapa, ([cargo, pessoas]) => ({ nome: cargo, pessoas })).sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, 'pt-BR'));
    return { nivel, nome, pessoas: lista.reduce((soma, item) => soma + item.pessoas, 0), cargos: lista };
  };
  const lista = NIVEIS.map(item => montar(item.nivel, item.nome));
  const sem = montar(null, 'Sem nível');
  return sem.pessoas > 0 ? [...lista, sem] : lista;
};

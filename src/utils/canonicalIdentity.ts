import type { Empresa, Equipamento, Funcionario } from '../types';

export const normalizeComparable = (value: unknown) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export const normalizePrefix = (value: unknown) => normalizeComparable(value).replace(/[^a-z0-9]/g, '').toUpperCase();
export const normalizePlate = (value: unknown) => normalizeComparable(value).replace(/[^a-z0-9]/g, '').toUpperCase();
export const normalizeEmployeeCode = (value: unknown) => normalizeComparable(value).replace(/[^a-z0-9]/g, '').toUpperCase();
export const normalizeRegistration = normalizeEmployeeCode;
export const normalizeCompanyName = (value: unknown) => normalizeComparable(value).replace(/\s+/g, ' ');

/**
 * Índices por lista (24/11/2026): a frota procura máquina e pessoa para cada
 * lançamento; com `find` normalizando a lista inteira a cada procura, abrir
 * Lançamentos com 2 mil registros levava meio segundo só nisso. O índice
 * guarda o primeiro de cada chave, então o resultado é o mesmo do `find`.
 */
/** Todos os itens de cada chave, na ordem da lista (o mesmo que um `filter`). */
const todosPor = <T, K>(lista: readonly T[], chave: (item: T) => K) => {
  const mapa = new Map<K, T[]>();
  for (const item of lista) {
    const k = chave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
};

const emCache = <T extends object, I>(cache: WeakMap<T, { tamanho: number; indice: I }>, lista: T & { length: number }, montar: () => I): I => {
  const guardado = cache.get(lista);
  if (guardado && guardado.tamanho === lista.length) return guardado.indice;
  const indice = montar();
  cache.set(lista, { tamanho: lista.length, indice });
  return indice;
};

const INDICE_EQUIPAMENTOS = new WeakMap<Equipamento[], { tamanho: number; indice: ReturnType<typeof indicarEquipamentos> }>();
const indicarEquipamentos = (equipamentos: Equipamento[]) => ({
  porId: todosPor(equipamentos, item => item.id as string | undefined),
  porPrefixo: todosPor(equipamentos, item => normalizePrefix(item.prefixo)),
  porPlaca: todosPor(equipamentos, item => normalizePlate(item.placa || item.seriePlaca)),
});

/** Máquinas por id, prefixo e placa normalizados (guardado enquanto a lista for a mesma). */
export const indiceDeEquipamentos = (equipamentos: Equipamento[]) =>
  emCache(INDICE_EQUIPAMENTOS, equipamentos, () => indicarEquipamentos(equipamentos));

export const findEquipmentCanonical = (
  equipamentos: Equipamento[],
  reference: { id?: string; prefixo?: string; placa?: string; empresaId?: string },
) => {
  const indice = indiceDeEquipamentos(equipamentos);
  // (Prefixo + empresa nunca acha nada que o prefixo sozinho não ache.)
  return indice.porId.get(reference.id)?.[0]
    || indice.porPrefixo.get(normalizePrefix(reference.prefixo))?.[0]
    || indice.porPlaca.get(normalizePlate(reference.placa))?.[0];
};

const INDICE_FUNCIONARIOS = new WeakMap<Funcionario[], { tamanho: number; indice: ReturnType<typeof indicarFuncionarios> }>();
const indicarFuncionarios = (funcionarios: Funcionario[]) => ({
  porId: todosPor(funcionarios, item => item.id as string | undefined),
  porMatricula: todosPor(funcionarios, item => normalizeEmployeeCode(item.matricula)),
});

/** Pessoas por id e matrícula normalizada (guardado enquanto a lista for a mesma). */
export const indiceDeFuncionarios = (funcionarios: Funcionario[]) =>
  emCache(INDICE_FUNCIONARIOS, funcionarios, () => indicarFuncionarios(funcionarios));

export const findEmployeeCanonical = (
  funcionarios: Funcionario[],
  reference: { id?: string; matricula?: string },
) => {
  const indice = indiceDeFuncionarios(funcionarios);
  return indice.porId.get(reference.id)?.[0] || indice.porMatricula.get(normalizeEmployeeCode(reference.matricula))?.[0];
};

export const findCompanyCanonical = (
  empresas: Empresa[],
  reference: { id?: string; nome?: string },
) => empresas.find(item => item.id === reference.id)
  || empresas.find(item => normalizeCompanyName(item.nome) === normalizeCompanyName(reference.nome));

export const operationalRowKey = (input: {
  sourceId?: string; date?: string; prefix?: string; plate?: string; employeeCode?: string; time?: string; type?: string; origin?: string;
}) => input.sourceId
  ? `source:${normalizeComparable(input.sourceId)}`
  : [input.date, normalizePrefix(input.prefix), normalizePlate(input.plate), normalizeEmployeeCode(input.employeeCode), input.time, normalizeComparable(input.type), normalizeComparable(input.origin)].join('|');

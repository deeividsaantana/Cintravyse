import assert from 'node:assert/strict';
import test from 'node:test';
import type { Cargo, Funcionario, GrupoEquipe } from '../src/types';
import {
  cargosQueFaltam,
  equipePorPessoa,
  linhaDeComando,
  montarEstrutura,
  montarPiramide,
  nivelSugerido,
  novosCargos,
} from '../src/utils/hierarquia';
import { montarRegistro, valoresIniciais } from '../src/components/cadastros/camposCadastro';
import { montarLinhas, type DadosCadastros } from '../src/utils/cadastrosLista';
import { usosDoCadastro, type CadastroUsage } from '../src/masterData/registryDependencies';
import { abasCadastros } from '../src/components/cadastros/abasCadastros';
import { validateCentralRecord } from '../src/masterData/centralRegistry';

/**
 * Pessoas em Cadastros (22/11/2026): cargos com nível, equipes, organograma
 * e pirâmide saem do mesmo cadastro de colaboradores, sem nada duplicado.
 */
const pessoa = (id: string, nome: string, cargo: string, lider?: string, extra: Partial<Funcionario> = {}): Funcionario => ({
  id, matricula: id.replace(/\D/g, '') || id, nome, cargo, telefone: '', empresaId: 'emp-1', ativo: true, status: 'ATIVO',
  liderMatricula: lider, ...extra,
});

const gerente = pessoa('p1', 'Paulo', 'Gerente de obra');
const engenheira = pessoa('p2', 'Ana', 'Engenheira civil', '1');
const encarregado = pessoa('p3', 'Vanderlei', 'Encarregado', '2');
const operador = pessoa('p4', 'José', 'Operador', '3');
const ajudante = pessoa('p5', 'João', 'Ajudante', '3');
const solto = pessoa('p6', 'Marcos', 'Motorista');
const inativo = pessoa('p7', 'Rita', 'Operador', '3', { ativo: false, status: 'DESMOBILIZADO' });
const todos = [gerente, engenheira, encarregado, operador, ajudante, solto, inativo];

const cargos: Cargo[] = [
  { id: 'CAR-0001', nome: 'Gerente de obra', nivel: 2 },
  { id: 'CAR-0002', nome: 'Engenheira civil', nivel: 3 },
  { id: 'CAR-0003', nome: 'Encarregado', nivel: 4 },
  { id: 'CAR-0004', nome: 'OPERADOR', nivel: 5 },
];

test('nível sugerido pelo nome do cargo, sem acento e sem caixa', () => {
  assert.equal(nivelSugerido('DIRETOR DE OPERAÇÕES'), 1);
  assert.equal(nivelSugerido('Gerente de Contrato'), 2);
  assert.equal(nivelSugerido('ENGENHEIRO CIVIL'), 3);
  assert.equal(nivelSugerido('Técnica de segurança'), 3);
  assert.equal(nivelSugerido('ENCARREGADO DE TERRAPLENAGEM'), 4);
  assert.equal(nivelSugerido('Líder de turma'), 4);
  assert.equal(nivelSugerido('OPERADOR DE ESCAVADEIRA'), 5);
  assert.equal(nivelSugerido('Auxiliar de engenharia'), 6, 'auxiliar vence engenharia');
  assert.equal(nivelSugerido('SERVENTE'), 6);
});

test('cargos que faltam: só os usados e ainda sem cadastro, do mais usado ao menos', () => {
  const faltam = cargosQueFaltam(todos, cargos);
  assert.deepEqual(faltam.map(item => item.nome), ['Ajudante', 'Motorista']);
  const novos = novosCargos(faltam, cargos, '2026-11-22T00:00:00.000Z');
  assert.deepEqual(novos.map(item => [item.id, item.nome, item.nivel]), [['CAR-0005', 'Ajudante', 6], ['CAR-0006', 'Motorista', 5]]);
  // "OPERADOR" e "Operador" são o mesmo cargo.
  assert.equal(cargosQueFaltam([pessoa('x', 'X', 'operador ')], cargos).length, 0);
});

test('estrutura: topo, liderados, linha de comando e total abaixo', () => {
  const estrutura = montarEstrutura(todos.filter(item => item.ativo), cargos);
  assert.deepEqual(estrutura.topo.map(item => item.nome), ['Paulo']);
  assert.deepEqual(estrutura.semLider.map(item => item.nome), ['Marcos']);
  assert.deepEqual(estrutura.liderados.get('p3')?.map(item => item.nome), ['José', 'João'], 'operador (nível 5) antes de quem não tem nível');
  assert.equal(estrutura.abaixo.get('p1'), 4);
  assert.deepEqual(linhaDeComando(operador, estrutura).map(item => item.nome), ['Paulo', 'Ana', 'Vanderlei', 'José']);
});

test('estrutura não trava com ciclo de liderança', () => {
  const a = pessoa('p8', 'A', 'Encarregado', '9');
  const b = pessoa('p9', 'B', 'Encarregado', '8');
  const estrutura = montarEstrutura([a, b], cargos);
  assert.equal(estrutura.topo.length + estrutura.semLider.length >= 1, true);
  assert.ok(linhaDeComando(a, estrutura).length <= 2);
});

test('pirâmide conta só ativos por nível; cargo sem cadastro vai para Sem nível', () => {
  const piramide = montarPiramide(todos, cargos);
  const por = new Map(piramide.map(item => [item.nivel, item.pessoas]));
  assert.equal(por.get(2), 1);
  assert.equal(por.get(5), 1, 'o operador desmobilizado não conta');
  assert.equal(por.get(null), 2);
  assert.deepEqual(piramide.find(item => item.nivel === null)?.cargos.map(item => item.nome).sort(), ['Ajudante', 'Motorista']);
});

const equipe: GrupoEquipe = {
  id: 'g-1', nome: 'Terraplenagem A', responsavel: 'Vanderlei', liderMatricula: '3', frenteServico: 'Aterro Ramo 900',
  funcionarioIds: ['p4', 'p5'], status: 'ativo', token: 'presenca-abc', linkAtivo: true, createdAt: '', updatedAt: '',
};

const dados: DadosCadastros = {
  empresas: [{ id: 'emp-1', nome: 'RENEA', cnpj: '', telefone: '', responsavel: '' }],
  funcionarios: todos, equipamentos: [], obras: [], comboios: [], combustiveis: [], lubrificantes: [], canteiros: [], etapas: [],
  frentesServico: [{ id: 'FRE-1', nome: 'Aterro Ramo 900', situacao: 'Em execução', ativo: true, criadoEm: '', atualizadoEm: '' }],
  servicosObra: [], cargos, gruposEquipe: [equipe],
};

test('lista de colaboradores mostra cargo e equipe; lista de cargos conta as pessoas', () => {
  const linha = montarLinhas('funcionarios', dados).find(item => item.id === 'p4');
  assert.equal(linha?.colunas.equipe, 'Terraplenagem A');
  assert.equal(linha?.filtros.equipe, 'Terraplenagem A');
  const cargosLinhas = montarLinhas('cargos', dados);
  assert.equal(cargosLinhas.find(item => item.id === 'CAR-0004')?.colunas.pessoas, '1');
  assert.equal(cargosLinhas.find(item => item.id === 'CAR-0004')?.colunas.nivel, '5 · Operacional');
  const equipes = montarLinhas('equipes', dados);
  assert.equal(equipes[0].colunas.pessoas, '2');
  assert.equal(equipePorPessoa([equipe]).get('p5')?.id, 'g-1');
});

test('cargo: nome repetido é recusado e o nível vai para o registro', () => {
  const repetido = montarRegistro('cargos', { nome: 'encarregado', nivel: '4', area: '', descricao: '' }, undefined, 'CAR-0009', dados);
  assert.equal(repetido.ok, false);
  const novo = montarRegistro('cargos', { nome: 'Apontador', nivel: '3', area: 'Produção', descricao: '' }, undefined, 'CAR-0009', dados);
  assert.equal(novo.ok, true);
  if (novo.ok) assert.equal((novo.registro as Cargo).nivel, 3);
});

test('equipe: encarregado vira responsável, membros guardam a matrícula e o link nasce pronto', () => {
  const iniciais = valoresIniciais('equipes', equipe, dados);
  assert.equal(iniciais.encarregadoId, 'p3');
  assert.deepEqual(iniciais.funcionarioIds, ['p4', 'p5']);
  const nova = montarRegistro('equipes', { nome: 'Drenagem', encarregadoId: 'p3', frenteServico: 'Aterro Ramo 900', funcionarioIds: ['p4', 'nao-existe'] }, undefined, 'grp-1', dados);
  assert.equal(nova.ok, true);
  if (!nova.ok) return;
  const registro = nova.registro as GrupoEquipe;
  assert.equal(registro.responsavel, 'Vanderlei');
  assert.equal(registro.liderMatricula, '3');
  assert.deepEqual(registro.funcionarioIds, ['p4']);
  assert.deepEqual(registro.funcionarioMatriculas, ['4']);
  assert.match(registro.token, /^presenca-[0-9a-f]{48}$/);
  // Editar mantém o token do link que já está com o encarregado.
  const editada = montarRegistro('equipes', { ...iniciais, nome: 'Terraplenagem A' }, equipe, 'g-1', dados);
  assert.equal(editada.ok && (editada.registro as GrupoEquipe).token, 'presenca-abc');
});

test('colaborador escolhe o cargo de uma lista: cadastrados e os já usados', () => {
  const valores = valoresIniciais('funcionarios', operador, dados);
  assert.equal(valores.cargo, 'Operador');
  assert.equal(valores.liderId, 'p3');
});

const usoVazio = (): CadastroUsage => ({
  abastecimentos: [], equipamentos: [], lubrificacoes: [], apontamentos: [],
  empresas: [], funcionarios: [], ordensServico: [], listasPresenca: [], presencasLink: [],
  gruposEquipe: [], controleEquipamentosDiario: [], colecoesDaObra: {},
  frentesServico: [], producao: [], planejamento: [], canteiros: [], cargos: [],
});

test('cargo em uso e equipe com presença não são excluídos de verdade', () => {
  const uso = usoVazio();
  uso.funcionarios = todos;
  uso.cargos = cargos;
  assert.deepEqual(usosDoCadastro('cargos', 'CAR-0004', uso), [{ collection: 'Colaboradores', count: 2 }]);
  uso.presencasLink = [{ funcionarioId: 'p4', grupoId: 'g-1' }];
  assert.deepEqual(usosDoCadastro('gruposEquipe', 'g-1', uso), [{ collection: 'Presenças pelo link', count: 1 }]);
});

test('Pessoas reúne colaboradores, cargos, equipes, organograma e pirâmide', () => {
  const [pessoas] = abasCadastros(() => 1, false);
  assert.ok('grupo' in pessoas);
  if (!('grupo' in pessoas)) return;
  assert.deepEqual(pessoas.abas.map(aba => aba.id), ['funcionarios', 'cargos', 'equipes', 'organograma', 'piramide']);
  const [comAdmin] = abasCadastros(() => 1, true);
  assert.ok('grupo' in comAdmin && comAdmin.abas.some(aba => aba.id === 'acessos'));
});

test('colaborador repetido não entra: matrícula (sem zeros à esquerda) ou nome igual', () => {
  const base = { empresas: [], equipamentos: [], obras: [], funcionarios: todos };
  const novo = (extra: Partial<Funcionario>) => validateCentralRecord({ ...base, record: pessoa('novo', 'Fulano Novo', 'Operador', undefined, { matricula: '999', ...extra }) });
  assert.match(novo({ matricula: '0001' }).join(' '), /matrícula: Paulo/);
  assert.match(novo({ nome: 'josé ' }).join(' '), /mesmo nome|este nome/);
  assert.deepEqual(novo({}), []);
  // Quem já está repetido no cadastro continua podendo ser editado.
  const gemeo = pessoa('p99', 'José', 'Operador', '3', { matricula: '' });
  const comGemeo = { ...base, funcionarios: [...todos, gemeo] };
  assert.deepEqual(validateCentralRecord({ ...comGemeo, record: { ...gemeo, telefone: '79' } }).filter(erro => /Já existe/.test(erro)), []);
});

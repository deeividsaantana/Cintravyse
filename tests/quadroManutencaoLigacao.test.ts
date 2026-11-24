import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  VISTA_DA_FROTA,
  VISTA_DA_MANUTENCAO,
  abasFrotaManutencao,
  telasDoTopo,
  vistaPadrao,
} from '../src/components/frotaManutencao/abasFrotaManutencao';

const ler = (arquivo: string) => readFileSync(arquivo, 'utf8');
const app = ler('src/App.tsx');
const moldura = ler('src/components/FrotaManutencao.tsx');

const CONTADORES = { faltando: 0, paradosAgora: 0, paraConferir10h: 0 };
const idsDasTelas = (acesso: { frota: boolean; manutencao: boolean }) =>
  telasDoTopo(abasFrotaManutencao(acesso, CONTADORES));

test('Frotas e Manutenção é uma aba só: Controle de Frotas e Manutenção abrem a mesma moldura (23/11/2026)', () => {
  assert.match(app, /\(activeTab === 'controle-equipamentos' \|\| activeTab === 'manutencao'\) && \(\s*<FrotaManutencao/);
  assert.doesNotMatch(app, /<ManutencaoTab|<ControleEquipamentosDiarioTab/);
  // Quem tem as duas permissões e chega pelo endereço da Manutenção cai nas ordens dentro da aba única.
  assert.match(app, /activeTab === 'manutencao' && allowedTabs\.includes\('controle-equipamentos'\)[\s\S]{0,200}vista: 'ordens'/);
});

test('nenhuma função antiga se perdeu na junção (23/11/2026)', () => {
  const daFrota = new Set(Object.values(VISTA_DA_FROTA));
  const daManutencao = new Set(Object.values(VISTA_DA_MANUTENCAO));
  // Conferir equipamentos e Conferir operadores viraram "Faltando", uma tela só.
  for (const tela of ['today', 'quadro', 'faltando', 'registry', 'history']) assert.ok(daFrota.has(tela as never), `Frotas perdeu ${tela}`);
  for (const tela of ['hoje', 'conferencia', 'ordens', 'relatorio', 'historico']) assert.ok(daManutencao.has(tela as never), `Manutenção perdeu ${tela}`);
  const frota = ler('src/components/ControleEquipamentosDiarioTab.tsx');
  assert.match(frota, /<FleetDailyReference[\s\S]{0,400}<FleetDriverReference/, 'máquinas e operadores faltando na mesma tela');
  // O antigo Relatório do dia da frota virou botões de baixar em Mais ações.
  for (const id of ['frota-relatorio-pdf', 'frota-relatorio-excel', 'frota-faltantes-pdf', 'frota-abrir-motoristas']) assert.match(frota, new RegExp(`data-testid="${id}"`));
  // Motoristas abre por Mais ações e Faltando pela faixa de Lançamentos: nenhuma ocupa lugar no topo.
  const todas = idsDasTelas({ frota: true, manutencao: true });
  assert.ok(!todas.includes('motoristas') && !todas.includes('faltando'));
  assert.equal(todas.length, Object.keys(VISTA_DA_FROTA).length + Object.keys(VISTA_DA_MANUTENCAO).length - 2);
});

test('padrão do site: sem segunda fileira, a escolha da tela é a caixinha Ver do AbasDaTela', () => {
  const itens = abasFrotaManutencao({ frota: true, manutencao: true }, CONTADORES);
  assert.deepEqual(itens.map(item => item.rotulo), ['Quadro', 'Lançamentos', 'Manutenção', 'Relatórios']);
  // Manutenção e Relatórios são grupos do componente comum, que mostra o "Ver" na mesma linha.
  assert.deepEqual(itens.filter(item => 'grupo' in item).map(item => item.rotulo), ['Manutenção', 'Relatórios']);
  assert.match(moldura, /<AbasDaTela<VistaFrotaManutencao>/);
  assert.doesNotMatch(moldura, /SeletorDaSecao/);
  // Lançamentos: a lista do dia é a tela; quem falta abre pela faixa e volta por um botão.
  const atalho = ler('src/components/frotaManutencao/AtalhoFaltando.tsx');
  assert.match(moldura, /<AtalhoFaltando/);
  assert.match(atalho, /data-testid="frota-ver-faltando"/);
  assert.match(atalho, /data-testid="frota-voltar-lancados"/);
  assert.doesNotMatch(atalho, /aria-pressed/);
  // Faltando mostra só quem falta, sem o filtro Faltam / Todas.
  for (const arquivo of ['FleetDailyReference', 'FleetDriverReference']) {
    assert.doesNotMatch(ler(`src/components/fleet/${arquivo}.tsx`), /opcoesFiltro|visibility/);
  }
});

test('quem só tem uma permissão vê só a parte dela', () => {
  const soFrota = idsDasTelas({ frota: true, manutencao: false });
  const soManutencao = idsDasTelas({ frota: false, manutencao: true });
  assert.ok(soFrota.every(id => VISTA_DA_FROTA[id]));
  assert.ok(soManutencao.every(id => VISTA_DA_MANUTENCAO[id]));
  assert.equal(vistaPadrao({ frota: false, manutencao: true }), 'parados');
  assert.equal(vistaPadrao({ frota: true, manutencao: true }), 'quadro');
});

test('Quadro e Manutenção se abrem um no outro pelo prefixo, sem sair da aba', () => {
  assert.match(moldura, /const verOrdens = manutencao \? \(prefixo: string\) => \{[\s\S]{0,160}setVista\('ordens'\)/);
  assert.match(moldura, /const verNoQuadro = frota \? \(prefixo: string\) => \{[\s\S]{0,120}setVista\('quadro'\)/);
  assert.match(moldura, /buscaInicial=\{pedidoOrdens\.prefixo\}/);
  assert.match(app, /onVerOrdens=\{verOrdens\}/);
  assert.match(ler('src/components/quadroFrota/PainelEquipamento.tsx'), /quadro-ver-ordens/);
  assert.match(ler('src/components/ManutencaoTab.tsx'), /onVerNoQuadro=\{onVerNoQuadro\}/);
  assert.match(ler('src/components/manutencao/CartaoParada.tsx'), /Ver no quadro/);
  assert.match(ler('src/components/manutencao/ManutencaoHoje.tsx'), /onVerNoQuadro=\{onVerNoQuadro \? \(\) => onVerNoQuadro\(registro\.prefixo\)/);
});

test('Topo do Quadro: alça de arrastar não passa por cima da faixa de filtros', () => {
  assert.match(ler('src/components/quadroFrota/QuadroFrota.tsx'), /lg:sticky lg:top-0 lg:z-20/);
  assert.doesNotMatch(ler('src/components/quadroFrota/CartaoArrastavel.tsx'), /absolute right-1 top-1 z-10/);
});

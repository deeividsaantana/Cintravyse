import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  VISTA_DA_FROTA,
  VISTA_DA_MANUTENCAO,
  abasFrotaManutencao,
  vistaPadrao,
} from '../src/components/frotaManutencao/abasFrotaManutencao';

const ler = (arquivo: string) => readFileSync(arquivo, 'utf8');
const app = ler('src/App.tsx');
const moldura = ler('src/components/FrotaManutencao.tsx');

const idsDasAbas = (acesso: { frota: boolean; manutencao: boolean }) =>
  abasFrotaManutencao(acesso, { equipamentosAConfirmar: 0, operadoresAConfirmar: 0, paradosAgora: 0, paraConferir10h: 0 })
    .flatMap(item => ('grupo' in item ? item.abas.map(aba => aba.id) : [item.id]));

test('Frotas e Manutenção é uma aba só: Controle de Frotas e Manutenção abrem a mesma moldura (23/11/2026)', () => {
  assert.match(app, /\(activeTab === 'controle-equipamentos' \|\| activeTab === 'manutencao'\) && \(\s*<FrotaManutencao/);
  assert.doesNotMatch(app, /<ManutencaoTab|<ControleEquipamentosDiarioTab/);
  // Quem tem as duas permissões e chega pelo endereço da Manutenção cai nas ordens dentro da aba única.
  assert.match(app, /activeTab === 'manutencao' && allowedTabs\.includes\('controle-equipamentos'\)[\s\S]{0,200}vista: 'ordens'/);
});

test('nenhuma subtela antiga se perdeu na junção', () => {
  const todas = idsDasAbas({ frota: true, manutencao: true });
  const daFrota = new Set(Object.values(VISTA_DA_FROTA));
  const daManutencao = new Set(Object.values(VISTA_DA_MANUTENCAO));
  for (const antiga of ['today', 'quadro', 'equipamentos', 'operadores', 'registry', 'relatorio', 'history']) {
    assert.ok(daFrota.has(antiga as never), `Frotas perdeu ${antiga}`);
  }
  for (const antiga of ['hoje', 'conferencia', 'ordens', 'relatorio', 'historico']) {
    assert.ok(daManutencao.has(antiga as never), `Manutenção perdeu ${antiga}`);
  }
  assert.equal(todas.length, Object.keys(VISTA_DA_FROTA).length + Object.keys(VISTA_DA_MANUTENCAO).length);
});

test('quem só tem uma permissão vê só a parte dela', () => {
  const soFrota = idsDasAbas({ frota: true, manutencao: false });
  const soManutencao = idsDasAbas({ frota: false, manutencao: true });
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

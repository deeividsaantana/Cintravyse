import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildFuelReport } from '../src/modules/frota/fuelReport';
import { preencherPlanilhaDiesel } from '../src/modules/frota/exportarPlanilhaDiesel';
import { nomeNoRelatorio, paraRelatorio } from '../src/utils/outroContrato';

test('máquina de terceiro sai como Equipamento de Outro Contrato no relatório', () => {
  assert.equal(paraRelatorio('Equipamento locado'), 'Equipamento de Outro Contrato');
  assert.equal(paraRelatorio('Locado (empresa a confirmar)'), 'Equipamento de Outro Contrato');
  assert.equal(paraRelatorio('NÃO CADASTRADO'), 'Equipamento de Outro Contrato');
  assert.equal(paraRelatorio('Locado'), 'Equipamento de Outro Contrato');
  assert.equal(paraRelatorio('Equipamento locado · Locado (empresa a confirmar)'), 'Equipamento de Outro Contrato · Equipamento de Outro Contrato');
  assert.equal(nomeNoRelatorio(''), 'Equipamento de Outro Contrato');
  assert.equal(nomeNoRelatorio(undefined), 'Equipamento de Outro Contrato');
  // Nome de verdade não muda, mesmo de máquina alugada com nome próprio.
  assert.equal(paraRelatorio('Compressor de Ar'), 'Compressor de Ar');
  assert.equal(paraRelatorio('Caminhão Basculante'), 'Caminhão Basculante');
  assert.equal(paraRelatorio('Locadora Silva'), 'Locadora Silva');
});

test('o Excel do diesel não mostra "Equipamento locado" nem "NÃO CADASTRADO"', async () => {
  const relatorio = buildFuelReport({
    records: [
      { id: 'a', data: '2026-11-10', hora: '07:00', equipamentoId: 'eq-lo', comboioId: '', tipoCombustivelId: '', quantidadeLitros: 50, status: 'OK' },
      { id: 'b', data: '2026-11-10', hora: '08:00', equipamentoId: '', prefixoInformado: 'TCK1J66', comboioId: '', tipoCombustivelId: '', quantidadeLitros: 30, status: 'OK' },
      { id: 'c', data: '2026-11-10', hora: '09:00', equipamentoId: 'eq-cb', comboioId: '', tipoCombustivelId: '', quantidadeLitros: 20, status: 'OK' },
    ] as never,
    equipamentos: [
      { id: 'eq-lo', prefixo: 'LO144', nome: 'Equipamento locado', empresaId: 'emp-locado' },
      { id: 'eq-cb', prefixo: 'CB940', nome: 'Caminhão Basculante', empresaId: 'emp-renea' },
    ] as never,
    empresas: [{ id: 'emp-locado', nome: 'Locado (empresa a confirmar)' }, { id: 'emp-renea', nome: 'Renea' }] as never,
    comboios: [],
    combustiveis: [],
  });
  const porPrefixo = Object.fromEntries(relatorio.linhasExcel.map(linha => [linha.prefixo, [linha.descricao, linha.empresa]]));
  assert.deepEqual(porPrefixo, {
    LO144: ['Equipamento de Outro Contrato', 'Equipamento de Outro Contrato'],
    TCK1J66: ['Equipamento de Outro Contrato', 'Equipamento de Outro Contrato'],
    CB940: ['Caminhão Basculante', 'Renea'],
  });

  const pasta = new ExcelJS.Workbook();
  preencherPlanilhaDiesel(pasta, relatorio.linhasExcel, [
    { prefixo: 'LO144', nome: 'Equipamento locado', familia: 'Locado', empresa: 'Locado (empresa a confirmar)', status: 'Ativo' },
  ]);
  const textos: string[] = [];
  pasta.eachSheet(aba => aba.eachRow(linha => linha.eachCell(celula => { if (typeof celula.value === 'string') textos.push(celula.value); })));
  assert.equal(textos.some(texto => /equipamento locado|n[ãa]o cadastrado|empresa a confirmar|^locado$/i.test(texto)), false);
  assert.deepEqual((pasta.getWorksheet('Equipamentos')!.getRow(2).values as unknown[]).slice(1), ['LO144', 'Equipamento de Outro Contrato', 'Equipamento de Outro Contrato', 'Equipamento de Outro Contrato', 'Ativo']);
});

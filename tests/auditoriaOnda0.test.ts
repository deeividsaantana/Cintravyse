import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { applyFieldUpdates, getAdminAuth, requireSupabaseUser, substituirClienteSupabase } from '../api/_shared/supabase-admin.js';
import { assertProcurementPermission, procurementActorFromStaff } from '../api/_shared/procurement-authorization.js';
import { handler as usageTelemetryHandler } from '../api/usage-telemetry.js';
import { handler as procurementSheetHandler } from '../api/procurement-sheet.js';
import { tabelaParaCsv } from '../src/utils/exportarTabela';
import { isOperationalFleet, classifyOperationalFleet } from '../src/fleet/reconciliation';
import { parseFuelAnalyticsNumber } from '../src/utils/fuelAnalyticsSafety';
import { montarConsumoPorEquipamento } from '../src/modules/frota/consumoPorEquipamento';
import { formatDurationMinutes } from '../src/fleet/time';
import { horasParadasDoDia } from '../src/utils/horasParadasDoDia';
import { liberarMaquinasDaOrdemConcluida } from '../src/utils/manutencao';
import { montarMesDeChuva } from '../src/utils/mapaChuva';
import { buildStakeSummary, calculateStakeBalance } from '../src/utils/stakeOperations';
import { abrirSolicitacao, aplicarAcao, type Ator } from '../src/utils/solicitacoes';
import { createIdempotencyKey, enqueueOfflineCommand, flushOfflineCommands, listOfflineCommands } from '../src/utils/offlineQueue';
import type { Abastecimento, ControleEquipamentoDiario, DiarioObra, Empresa, Equipamento, LoteEstaca, OrdemServico } from '../src/types';

test('SEC-01: primeiro-acesso usa validade finita (sem 2999-12-31) e checa expires_at no fechamento', () => {
  const source = fs.readFileSync('api/primeiro-acesso.js', 'utf8');
  assert.doesNotMatch(source, /2999-12-31/);
  assert.match(source, /FIRST_ACCESS_TTL_HOURS/);
  assert.match(source, /\.gt\('expires_at', agora\)/);
});

test('SEC-02: conta leitura não escala para aprovador em Compras mudando nome para Bruno', () => {
  const ator = procurementActorFromStaff({ uid: 'u1', name: 'Bruno', role: 'leitura' });
  assert.equal(ator.role, 'visualizador');
  assert.throws(() => assertProcurementPermission(ator, 'approve'), /403/);
  const atorViewer = procurementActorFromStaff({ uid: 'u2', name: 'Sérgio', role: 'viewer' });
  assert.equal(atorViewer.role, 'visualizador');
  assert.throws(() => assertProcurementPermission(atorViewer, 'dispatch'), /403/);
  // Papel explícito vindo de app_metadata.procurement_role continua prevalecendo.
  const autorizado = procurementActorFromStaff({ uid: 'u3', name: 'Bruno', role: 'admin', procurementRole: 'aprovador' });
  assert.equal(autorizado.role, 'aprovador');
  assert.doesNotThrow(() => assertProcurementPermission(autorizado, 'approve'));
});

test('SEC-03/SEC-09: requireSupabaseUser bloqueia usuário banido, usage-telemetry filtra organização e conta user_id', async () => {
  const filtrosOrg: string[] = [];
  const banco = {
    auth: {
      getUser: async (token: string) => ({
        data: {
          user: token === 'banido'
            ? { id: 'u-ban', email: 'ban@obra.com', banned_until: '2999-01-01T00:00:00Z', user_metadata: {}, app_metadata: {} }
            : token === 'leitor'
              ? { id: 'u-read', email: 'read@obra.com', banned_until: null, user_metadata: { full_name: 'Leitor' }, app_metadata: { role: 'leitura' } }
              : { id: 'u-adm', email: 'adm@obra.com', banned_until: null, user_metadata: { full_name: 'Admin' }, app_metadata: { role: 'admin' } },
        },
        error: null,
      }),
      admin: {
        deleteUser: async () => ({ data: {}, error: null }),
      },
    },
    from: (table: string) => {
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: (_col: string, uid: string) => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { organization_id: 'org-alpha', role: uid === 'u-read' ? 'viewer' : 'admin' },
                  error: null,
                }),
              }),
            }),
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            if (col === 'organization_id') filtrosOrg.push(val);
            return {
              gte: async () => ({
                data: [
                  { user_id: 'u-1', tabs: { dashboard: 3 }, updated_at: '2026-11-28T10:00:00Z' },
                  { user_id: 'u-2', tabs: { dashboard: 2 }, updated_at: '2026-11-28T11:00:00Z' },
                ],
                error: null,
              }),
            };
          },
        }),
      };
    },
  };

  substituirClienteSupabase(banco);
  try {
    await assert.rejects(
      () => requireSupabaseUser({ headers: { authorization: 'Bearer banido' } }),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );

    const resLeitor = await usageTelemetryHandler({ httpMethod: 'GET', headers: { authorization: 'Bearer leitor' }, queryStringParameters: {} });
    assert.equal(resLeitor.statusCode, 403);

    const resAdmin = await usageTelemetryHandler({ httpMethod: 'GET', headers: { authorization: 'Bearer admin' }, queryStringParameters: { days: '7' } });
    assert.equal(resAdmin.statusCode, 200);
    const body = JSON.parse(resAdmin.body);
    assert.deepEqual(filtrosOrg, ['org-alpha']);
    assert.equal(body.summary.activeUsers, 2);

    const resSheetPost = await procurementSheetHandler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer leitor' },
      body: JSON.stringify({ linhas: [{ pedido: '1', item: 'Cimento', sc: '123' }] }),
    });
    assert.equal(resSheetPost.statusCode, 403);

    assert.equal(typeof getAdminAuth().deleteUser, 'function');
  } finally {
    substituirClienteSupabase(null);
  }
});

test('SEC-08: applyFieldUpdates bloqueia prototype pollution e exportarTabela neutraliza fórmulas CSV', () => {
  const result = applyFieldUpdates({ ok: true }, { '__proto__.polluted': 'yes', 'constructor.prototype.x': 1, 'safe.value': 42 });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal((result.safe as Record<string, unknown>).value, 42);

  const csv = tabelaParaCsv(
    [{ texto: '=CMD|"/C calc"!A0', alerta: '+2+3', negativo: -12.5, arroba: '@SUM(A1)' }],
    [
      { titulo: 'Texto', valor: l => l.texto },
      { titulo: 'Alerta', valor: l => l.alerta },
      { titulo: 'Negativo', valor: l => l.negativo },
      { titulo: 'Arroba', valor: l => l.arroba },
    ],
  );
  const [, linha] = csv.split('\r\n');
  assert.match(linha, /^"'=CMD/);
  assert.match(linha, /;\'\+2\+3;-12,5;\'@SUM\(A1\)$/);
});

test('FE-01/FE-03: CSS mobile válido para barra inferior e ConfirmDialog neutral com texto legível e ariaLabelledBy', () => {
  const css = fs.readFileSync('src/index.css', 'utf8');
  assert.doesNotMatch(css, /#mobile-header\s+@media/);
  assert.match(css, /@media \(max-width: 1023px\)\s*\{\s*\.erp-barra-celular \{ display: grid; \}/);

  const confirm = fs.readFileSync('src/shared/ui/ConfirmDialog.tsx', 'utf8');
  assert.match(confirm, /neutral: '[^']*text-slate-900/);
  assert.match(confirm, /ariaLabelledBy=\{titleId\}/);
});

test('BE-03: todas as migrations em supabase/migrations têm prefixo numérico único', () => {
  const files = fs.readdirSync(path.resolve('supabase/migrations')).filter(name => name.endsWith('.sql'));
  const seen = new Map<string, string>();
  for (const file of files) {
    const prefix = file.split('_')[0];
    assert.ok(!seen.has(prefix), `Prefixo de migration duplicado ${prefix}: ${seen.get(prefix)} e ${file}`);
    seen.set(prefix, file);
  }
});

test('DOM-02: solicitação criada no sistema não pode registrar recebimento antes de aprovação', () => {
  const thiago: Ator = { nome: 'Thiago', papel: 'solicitante' };
  const almox: Ator = { nome: 'Almoxarife', papel: 'recebedor' };
  const aberta = abrirSolicitacao({
    solicitante: 'Thiago',
    frente: 'Ramo 1400',
    estacamento: 'Estaca 1401+0,00',
    itens: [{ tipo: 'Material', descricao: 'Brita nº 1', quantidade: '10', unidade: 'm³', prazoDesejado: '2026-12-01', permiteParcial: false }],
  }, thiago, [], '2026-11-28T08:00:00.000Z', 'sol-1');
  assert.equal(aberta.ok, true);
  if (!aberta.ok) return;

  const tentativa = aplicarAcao(aberta.solicitacao, {
    tipo: 'receber',
    recebimento: { tipo: 'Chegou ao Local', local: 'Canteiro', notaFiscal: 'NF-99', quantidades: { 1: 10 } },
  }, almox, '2026-11-28T09:00:00.000Z');
  assert.equal(tentativa.ok, false);
});

test('DOM-03: Linha Amarela entra na reconciliação e classificação operacional de frota', () => {
  const escavadeira = {
    id: 'eq-es01', prefixo: 'ES01', nome: 'Escavadeira Hidráulica', tipo: 'Escavadeira',
    marca: 'CAT', modelo: '320', seriePlaca: '', empresaId: 'e1', status: 'Ativo',
    localAtualId: 'obra1', observacao: '', familia: 'Escavadeiras',
  } as Equipamento;
  const patrol = { ...escavadeira, id: 'eq-mn01', prefixo: 'MN01', nome: 'Motoniveladora', tipo: 'Motoniveladora', familia: '' } as Equipamento;
  assert.equal(isOperationalFleet(escavadeira), true);
  assert.equal(isOperationalFleet(patrol), true);
  assert.equal(classifyOperationalFleet(patrol).group, 'Linha Amarela');
});

test('DOM-04: offlineQueue preserva comandos distintos do mesmo kind, deduplica idênticos e registra falhas', async () => {
  const store = new Map<string, string>();
  const origLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    },
  });
  try {
    assert.equal(createIdempotencyKey('sync', { a: 1, b: 2 }), createIdempotencyKey('sync', { b: 2, a: 1 }));
    await enqueueOfflineCommand('abastecimento', { id: 'ab-1', litros: 100 });
    await enqueueOfflineCommand('abastecimento', { id: 'ab-2', litros: 200 });
    await enqueueOfflineCommand('abastecimento', { id: 'ab-1', litros: 100 });
    const pendentes = await listOfflineCommands();
    assert.equal(pendentes.length, 2, 'dois payloads distintos do mesmo kind ficam na fila sem sobrescrever');

    const res = await flushOfflineCommands({
      abastecimento: async cmd => {
        if ((cmd.payload as { id: string }).id === 'ab-2') throw new Error('Sem rede');
      },
    });
    assert.equal(res.processed, 1);
    assert.equal(res.failed, 1);
    const restantes = await listOfflineCommands();
    assert.equal(restantes.length, 1);
    assert.equal(restantes[0].attempts, 1);
    assert.equal(restantes[0].lastError, 'Sem rede');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: origLocalStorage });
  }
});

test('DOM-06/07/08: parser numérico, consumo sem leitura intermediária, 00:60, data futura, OS multi-dia, mapaChuva e estacas Saída', () => {
  assert.equal(parseFuelAnalyticsNumber('1,234.56'), 1234.56);
  assert.equal(parseFuelAnalyticsNumber('1.234,56'), 1234.56);

  const equipamentos = [{ id: 'eq-1', prefixo: 'ES01', nome: 'Escavadeira', empresaId: 'e1' }] as Equipamento[];
  const empresas = [{ id: 'e1', nome: 'RENEA' }] as Empresa[];
  const mkAb = (id: string, data: string, horimetroInicial: number, quantidadeLitros: number, status?: Abastecimento['status']): Abastecimento => ({
    id, data, hora: '08:00', equipamentoId: 'eq-1', horimetroInicial, kmInicial: 0,
    bombaInicial: 0, quantidadeLitros, bombaFinal: 0, tipoCombustivelId: 'd', comboioId: 'c', responsavel: '', observacao: '', status,
  });
  const [consumo] = montarConsumoPorEquipamento({
    registros: [
      mkAb('1', '2026-11-01', 1000, 100),
      mkAb('2', '2026-11-02', 0, 100), // sem leitura: litros devem acumular para o próximo
      mkAb('3', '2026-11-03', 1010, 100),
      mkAb('4', '2026-11-04', 1020, 999, 'Cancelado'),
    ],
    equipamentos,
    empresas,
  });
  assert.equal(consumo.abastecimentos, 3, 'registro cancelado não entra');
  assert.equal(consumo.consumoPeriodo, 20, '(100 + 100) L / 10 h = 20 L/h');

  assert.equal(formatDurationMinutes(59.6), '01:00');

  const futuro: ControleEquipamentoDiario = {
    id: 'c-fut', chave: '2026-12-10|eq-1', data: '2026-12-10',
    funcionarioId: '', codigoFuncionario: '', nomeMotorista: '',
    equipamentoId: 'eq-1', prefixo: 'ES01', familia: 'Linha Amarela', tipoEquipamento: 'Escavadeira',
    status: 'Em manutenção', horaSaida: '', horaEntradaManutencao: '08:00', horaLiberacao: '',
    motivoManutencao: 'Teste', observacao: '', origem: 'SISTEMA', revisao: [],
    criadoEm: '2026-11-28T10:00:00Z', atualizadoEm: '2026-11-28T10:00:00Z',
  };
  const paradaFutura = horasParadasDoDia(futuro, new Date('2026-11-28T15:00:00Z'));
  assert.equal(paradaFutura.totalMin, 0);
  assert.equal(paradaFutura.limiteAtingidoAs, null);

  const osMultiDia: OrdemServico = {
    id: 'os-1', numero: 'OS-1', equipamentoId: 'eq-1', tipo: 'Corretiva', prioridade: 'Alta',
    descricao: 'Reparo', status: 'Concluída', dataAbertura: '2026-11-25', dataConclusao: '2026-11-27',
    responsavel: 'Oficina', observacao: '',
  };
  const diaAnterior = { ...futuro, id: 'd1', data: '2026-11-25', ordemServicoId: 'os-1' };
  const diaConclusao = { ...futuro, id: 'd2', data: '2026-11-27', ordemServicoId: 'os-1' };
  const liberacao = liberarMaquinasDaOrdemConcluida(osMultiDia, [diaAnterior, diaConclusao], 'Oficina', '2026-11-27T17:00:00Z');
  assert.equal(liberacao.liberados, 1);
  assert.equal(liberacao.registros[0].status, 'Em manutenção', 'dia anterior não recebe hora de liberação de hoje');
  assert.equal(liberacao.registros[1].status, 'Disponível');

  const mes = montarMesDeChuva([{
    id: 'd-1', data: '2026-11-10', climaManha: 'Chuva forte', climaTarde: 'Bom',
    responsavel: 'Eng', ativo: true, criadoEm: '', atualizadoEm: '',
  } as DiarioObra], 2026, 11);
  assert.equal(mes.dias[9].milimetros, null, 'ausência de medição não vira 0 mm');
  assert.equal(mes.diasSemDiario, 29);

  const loteSaida = {
    id: 'l-saida', data: '2026-11-10', notaFiscal: '10', fornecedor: 'F', movimento: 'Saída',
    materialCodigo: 'M1', descricao: 'Perfil', perfilModelo: 'P', tipoEstaca: 'Metálica',
    unidade: 'm', quantidadeFisica: 5, comprimentoM: 12, pesoKg: 1000, valorUnitario: 10, valorTotal: 100,
    nfConferida: true, divergenciaNF: '', status: 'Disponível', origem: 'Manual', criadoEm: '', atualizadoEm: '',
  } as unknown as LoteEstaca;
  assert.equal(calculateStakeBalance(loteSaida, []).recebidoM, 0);
  const resumoEstacas = buildStakeSummary({ lotes: [{ ...loteSaida, id: 'l-canc', movimento: 'Entrada', status: 'Cancelado' }], cravacoes: [] });
  assert.equal(resumoEstacas.lotes, 0);
  assert.equal(resumoEstacas.recebidoM, 0);
});

test('BE-04/FE-04: migration 202611280001 fecha bypass de não-array, protege historyLogs/presencasLink e remove shim escuro do CSS', () => {
  const sql = fs.readFileSync('supabase/migrations/202611280001_blindagem_onda0.sql', 'utf8');
  assert.match(sql, /create or replace function public\.erp_tabelas_encolhidas/i);
  assert.doesNotMatch(sql, /'historyLogs'|'presencasLink'/);
  assert.doesNotMatch(sql, /p_depois->entry\.key is null or jsonb_typeof\(p_depois->entry\.key\) = 'array'/i);
  assert.match(sql, /revoke all on function public\.erp_tabelas_encolhidas/i);

  const css = fs.readFileSync('src/index.css', 'utf8');
  assert.doesNotMatch(css, /:is\(\.bg-slate-950, \.bg-slate-900/);
});


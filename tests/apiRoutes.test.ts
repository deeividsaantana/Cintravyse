import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildRequestHash } from '../api/_shared/idempotency.js';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('o app chama a API em /api/ e não no endereço antigo', () => {
  for (const file of ['src/publicApi.ts', 'src/services/masterDataApi.ts', 'src/usageTelemetry.ts']) {
    const source = read(file);
    assert.match(source, /'\/api\/|`\/api\//, file);
    assert.doesNotMatch(source, /\.netlify\/functions/, file);
  }
});

test('o servidor da Render atende /api/ e mantém o endereço antigo', () => {
  const server = read('server/index.js');
  assert.match(server, /for \(const prefix of \['\/api', '\/\.netlify\/functions'\]\)/);
  for (const route of ['public-presenca', 'master-data', 'usage-telemetry', 'procurement', 'procurement-sheet']) {
    assert.match(server, new RegExp(`\\$\\{prefix\\}/${route}`), route);
  }
});

test('o servidor faz a limpeza diária sozinho, sem depender de pinger externo (25/11/2026)', () => {
  const server = read('server/index.js');
  assert.match(server, /setInterval\(limpar, umDia\)\.unref\(\)/);
  assert.match(server, /cleanupCloudData\(\)\)\s*\.catch/);
});

test('a API de compras usa a função transacional e nunca aceita papel do body', () => {
  const route = read('api/procurement.js');
  assert.match(route, /create_erp_request/);
  assert.match(route, /Array\.isArray\(body\.items\)/);
  assert.match(route, /staff\.uid/);
  assert.match(route, /staff\.organizationId/);
  assert.doesNotMatch(route, /body\.role/);
  assert.doesNotMatch(route, /body\.requester_user_id/);
});

test('transições de compras usam PATCH, versão esperada e função SQL autorizada', () => {
  const route = read('api/procurement.js');
  const migration = read('supabase/migrations/202611130001_procurement_core.sql');
  assert.match(route, /event\.httpMethod === 'PATCH'/);
  assert.match(route, /p_expected_version/);
  assert.match(route, /transition_erp_request/);
  assert.match(migration, /create or replace function public\.transition_erp_request/is);
  assert.match(migration, /version <> p_expected_version/is);
  assert.match(migration, /Aprovação exclusiva de Bruno/is);
  assert.match(migration, /Somente Recepção\/Campo recebe/is);
});

test('cliente de compras envia todos os itens da solicitação', () => {
  const client = read('src/services/procurementApi.ts');
  assert.match(client, /dados\.itens\.map/);
  assert.match(client, /quantity_first_delivery/);
  assert.match(client, /\/api\/procurement/);
});

test('consulta de compras devolve os itens completos do pedido', () => {
  const route = read('api/procurement.js');
  assert.match(route, /erp_request_items\(\*\)/);
  assert.match(route, /items: erp_request_items/);
});

test('adaptador Supabase representa documento ausente sem ler id de null', () => {
  const source = read('api/_shared/supabase-admin.js');
  assert.match(source, /id:\s*row\?\.id/);
  assert.match(source, /exists:\s*Boolean\(row\)/);
});

test('repetir um envio pelo endereço novo reaproveita a idempotência do antigo', () => {
  const body = JSON.stringify({ nome: 'Teste' });
  assert.equal(
    buildRequestHash({ httpMethod: 'POST', path: '/api/master-data', body }),
    buildRequestHash({ httpMethod: 'POST', path: '/.netlify/functions/master-data', body }),
  );
});

test('servidor: arquivo de versão antiga e rota de API inexistente dão 404, não a página do site', async () => {
  const { spawn } = await import('node:child_process');
  const porta = String(41000 + Math.floor(Math.random() * 1000));
  const servidor = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: porta, PROCUREMENT_SPREADSHEET_URL: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise<void>((pronto, falhou) => {
      servidor.stdout.on('data', dado => { if (String(dado).includes('no ar')) pronto(); });
      servidor.on('exit', codigo => falhou(new Error(`servidor saiu (${codigo})`)));
      setTimeout(() => falhou(new Error('servidor não subiu')), 10_000);
    });
    const base = `http://127.0.0.1:${porta}`;
    const asset = await fetch(`${base}/assets/App-versao-antiga.js`);
    assert.equal(asset.status, 404, 'pedaço de código de deploy anterior');
    const api = await fetch(`${base}/api/nao-existe`);
    assert.equal(api.status, 404);
    assert.match(api.headers.get('content-type') || '', /json/);
    const tela = await fetch(`${base}/contratacao-link/abc`);
    assert.equal(tela.status, 200, 'rota de tela continua abrindo o site');
  } finally {
    servidor.kill();
  }
});

test('o app recarrega sozinho uma vez quando falta código de um deploy novo', () => {
  const main = read('src/main.tsx');
  assert.match(main, /addEventListener\('vite:preloadError'/);
  assert.match(main, /sessionStorage\.setItem\(CHAVE_RECARGA/);
});

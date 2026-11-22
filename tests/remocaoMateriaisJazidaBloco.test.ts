import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202611100001_remover_materiais_jazida_do_bloco.sql');

test('materiais e jazida: saem do bloco e ficam guardados no arquivo', () => {
  assert.match(migration, /create table if not exists public\.erp_colecoes_removidas/);
  assert.match(migration, /primary key \(organization_id, colecao, id\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.erp_colecoes_removidas from anon, authenticated/);
  for (const colecao of ['materiaisCadastro', 'materiaisMovimentos', 'materiaisPrevistos', 'ticketsJazida']) {
    assert.match(migration, new RegExp(`'${colecao}'`));
  }
});

test('materiais e jazida: o gatilho guarda antes de tirar e nunca apaga do arquivo', () => {
  assert.match(migration, /before insert or update of payload on public\.erp_snapshots/);
  assert.doesNotMatch(migration, /delete from public\.erp_colecoes_removidas/);
  assert.ok(migration.indexOf('insert into public.erp_colecoes_removidas') < migration.indexOf('new.payload := new.payload - v_colecao'));
});

test('materiais e jazida: arquivo antigo apagado, gatilho só tira do bloco', () => {
  const apagar = read('supabase/migrations/202611220001_apagar_arquivo_materiais_jazida.sql');
  // O gatilho é trocado antes de apagar a tabela, senão salvamentos dariam erro.
  assert.ok(apagar.indexOf('create or replace function public.erp_tirar_colecoes_removidas()') < apagar.indexOf('drop table if exists public.erp_colecoes_removidas'));
  assert.doesNotMatch(apagar, /insert into public\.erp_colecoes_removidas/);
  assert.match(apagar, /new\.payload := new\.payload - v_colecao/);
  assert.match(apagar, /erp_contar_separados/);
  // Só essa tabela é apagada.
  assert.equal((apagar.match(/drop table/g) ?? []).length, 1);
  assert.doesNotMatch(apagar, /\bdelete from\b|\btruncate\b/i);
});

// Com um Postgres de teste (todas as migrações aplicadas), roda os cenários reais.
test('materiais e jazida: cenários no banco de teste', { skip: !process.env.PG_TEST_URL && 'sem PG_TEST_URL' }, () => {
  const run = spawnSync('psql', [String(process.env.PG_TEST_URL), '-f', 'tests/sql/removerMateriaisJazida.sql'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /ok - materiais e jazida fora do bloco/);
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202611230001_bloco_montado_como_texto.sql');

test('entrar mais rápido: a obra é devolvida como texto, sem remontar um jsonb de 16 MB', () => {
  // jsonb_object_agg e "bloco || coleções" levavam 9 s em produção (23/11).
  const corpo = migration.slice(migration.indexOf('create or replace function public.erp_montar_bloco_json('));
  assert.doesNotMatch(corpo.slice(0, corpo.indexOf('$$;')), /jsonb_object_agg|jsonb_agg/);
  assert.match(migration, /returns table \(payload json, updated_at timestamptz, record_count integer\)/);
  assert.match(migration, /select public\.erp_montar_bloco_json\(snapshot\.organization_id, snapshot\.payload\)/);
  // A troca do tipo exige drop: tudo numa transação para o app nunca ficar sem a função.
  assert.ok(migration.indexOf('begin;') < migration.indexOf('drop function if exists public.ler_erp_snapshot(text);'));
  assert.ok(migration.indexOf('commit;') > migration.indexOf('create function public.ler_erp_snapshot('));
  assert.match(migration, /revoke all on function public\.erp_montar_bloco_json\(text, jsonb\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.ler_erp_snapshot\(text\) to authenticated;/);
});

test('entrar mais rápido: mesmo conteúdo que erp_montar_bloco', { skip: !process.env.PG_TEST_URL && 'sem PG_TEST_URL' }, () => {
  // Sem o begin/commit do arquivo: o teste desfaz tudo no fim.
  const roteiro = ['begin;', migration.replace(/^(begin|commit);$/gm, ''), '\\i tests/sql/blocoMontadoComoTexto.sql', 'rollback;'].join('\n');
  const run = spawnSync('psql', [String(process.env.PG_TEST_URL), '-v', 'ON_ERROR_STOP=1'], { input: roteiro, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /bloco em texto igual ao jsonb/);
});

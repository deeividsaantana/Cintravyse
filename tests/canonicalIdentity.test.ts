import assert from 'node:assert/strict';
import { normalizeEmployeeCode, normalizePlate, normalizePrefix, operationalRowKey } from '../src/utils/canonicalIdentity';

assert.equal(normalizePrefix('CB 729'), 'CB729');
assert.equal(normalizePrefix('cb-729'), 'CB729');
assert.equal(normalizePlate('ABC-1D23'), 'ABC1D23');
assert.equal(normalizeEmployeeCode(' 001548 '), '001548');
assert.equal(
  operationalRowKey({ date: '2026-08-13', prefix: 'CB 729', employeeCode: '1548', time: '07:00', type: 'operação' }),
  operationalRowKey({ date: '2026-08-13', prefix: 'cb-729', employeeCode: '1548', time: '07:00', type: 'operacao' }),
);

// 24/11/2026: a procura usa índice, mas acha o mesmo que o `find` antigo
// (o primeiro da lista com o mesmo id, prefixo ou placa).
{
  const { findEquipmentCanonical, findEmployeeCanonical } = await import('../src/utils/canonicalIdentity');
  const antigoEquip = (lista: any[], ref: any) => lista.find(i => i.id === ref.id)
    || lista.find(i => normalizePrefix(i.prefixo) === normalizePrefix(ref.prefixo))
    || lista.find(i => normalizePlate(i.placa || i.seriePlaca) === normalizePlate(ref.placa));
  const equipamentos = [
    { id: 'a', prefixo: 'CB 729', placa: 'ABC-1D23' },
    { id: 'b', prefixo: 'cb-729', placa: '' },
    { id: 'c', prefixo: '', seriePlaca: 'XYZ9999' },
    { id: 'd', prefixo: 'EC 013' },
  ] as any[];
  for (const ref of [{ id: 'd' }, { prefixo: 'CB729' }, { placa: 'xyz-9999' }, { prefixo: 'nada' }, {}, { id: 'zz', prefixo: 'ec013' }]) {
    assert.equal(findEquipmentCanonical(equipamentos, ref)?.id, antigoEquip(equipamentos, ref)?.id, JSON.stringify(ref));
  }
  const pessoas = [{ id: 'p1', matricula: '001548' }, { id: 'p2', matricula: '1548' }, { id: 'p3' }] as any[];
  assert.equal(findEmployeeCanonical(pessoas, { matricula: ' 001548 ' })?.id, 'p1');
  assert.equal(findEmployeeCanonical(pessoas, { id: 'p3' })?.id, 'p3');
  assert.equal(findEmployeeCanonical(pessoas, { matricula: '999' }), undefined);
  // Lista que cresce (mesmo array): o índice é refeito.
  pessoas.push({ id: 'p4', matricula: '999' });
  assert.equal(findEmployeeCanonical(pessoas, { matricula: '999' })?.id, 'p4');
}

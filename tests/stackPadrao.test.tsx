import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Badge, Card, CardHeader, CardTitle, CardContent } from '../src/components/ui';
import { cn } from '../src/lib/utils';

test('stack oficial: primitivos shadcn/ui renderizam com cn() e tokens Cintravyse', () => {
  assert.equal(cn('px-2 py-1', 'px-4'), 'py-1 px-4');
  const html = renderToStaticMarkup(
    <Card>
      <CardHeader>
        <CardTitle>Obra Ativa</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="prefixo">Prefixo</Label>
        <Input id="prefixo" aria-invalid="true" defaultValue="ES01" />
        <Badge variant="success">Disponível</Badge>
        <Button type="button">Salvar</Button>
      </CardContent>
    </Card>,
  );
  assert.match(html, /data-slot="card"/);
  assert.match(html, /data-slot="input"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /data-slot="button"/);
  assert.match(html, /bg-\[#176b4d\]/);
});

test('stack oficial: Zod + @hookform/resolvers validam contrato de formulário', async () => {
  const schema = z.object({
    prefixo: z.string().trim().min(2, 'Informe o prefixo'),
    litros: z.number().positive('Informe os litros'),
  });
  const resolver = zodResolver(schema);
  const invalido = await resolver({ prefixo: '', litros: 0 }, undefined, { fields: {}, shouldUseNativeValidation: false });
  assert.ok(invalido.errors.prefixo);
  assert.ok(invalido.errors.litros);
  const valido = await resolver({ prefixo: 'ES01', litros: 120 }, undefined, { fields: {}, shouldUseNativeValidation: false });
  assert.deepEqual(valido.errors, {});
  assert.deepEqual(valido.values, { prefixo: 'ES01', litros: 120 });
});

test('stack oficial em produção: EscalaSabado usa shadcn/ui + Zod + RHF e DevTab usa TanStack Query', async () => {
  const { EscalaSabado } = await import('../src/components/presenca/EscalaSabado');
  const html = renderToStaticMarkup(
    <EscalaSabado
      funcionarios={[{ id: 'f1', nome: 'Carlos', matricula: '10', cargo: 'Motorista', telefone: '', empresaId: 'e1', ativo: true }]}
      gruposEquipe={[{ id: 'g1', nome: 'Equipe Terraplenagem', responsavel: 'Encarregado', frenteServico: 'Ramo 1400', funcionarioIds: ['f1'], status: 'ativo', token: 'tok', linkAtivo: true, createdAt: '', updatedAt: '' }]}
      onSalvar={() => {}}
      onCancelar={() => {}}
    />,
  );
  assert.match(html, /data-slot="button"/);
  assert.match(html, /data-slot="badge"/);
  assert.match(html, /data-slot="label"/);
  assert.match(html, /Equipe Terraplenagem/);

  const fs = await import('node:fs');
  const hook = fs.readFileSync('src/hooks/usePainelDevQuery.ts', 'utf8');
  const devTab = fs.readFileSync('src/components/DevTab.tsx', 'utf8');
  assert.match(hook, /from '@tanstack\/react-query'/);
  assert.match(devTab, /usePainelDevQuery/);
});


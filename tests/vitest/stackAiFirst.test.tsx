import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { EscalaSabado } from '@/components/presenca/EscalaSabado';
import type { Funcionario, GrupoEquipe } from '@/types';

const server = setupServer(
  http.get('/api/health-mock', () =>
    HttpResponse.json({ ok: true, stack: 'AI-First ERP', provider: 'supabase' }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const funcionarios: Funcionario[] = [
  { id: 'f1', nome: 'Carlos Silva', matricula: '1001', cargo: 'Operador', telefone: '', empresaId: 'e1', ativo: true },
  { id: 'f2', nome: 'Ana Souza', matricula: '1002', cargo: 'Encarregada', telefone: '', empresaId: 'e1', ativo: true },
];

const gruposEquipe: GrupoEquipe[] = [
  {
    id: 'g1',
    nome: 'Equipe Terraplenagem',
    responsavel: 'Ana Souza',
    frenteServico: 'Ramo 1400',
    funcionarioIds: ['f1', 'f2'],
    status: 'ativo',
    token: 'tok-1',
    linkAtivo: true,
    createdAt: '2026-11-28T00:00:00Z',
    updatedAt: '2026-11-28T00:00:00Z',
  },
];

describe('AI-First ERP Stack (Vitest + Testing Library + MSW + Zod/RHF + TanStack Query)', () => {
  it('valida seleção obrigatória de equipe em EscalaSabado com Zod + React Hook Form e salva quando válido', async () => {
    const onSalvar = vi.fn();
    render(
      <EscalaSabado
        funcionarios={funcionarios}
        gruposEquipe={gruposEquipe}
        onSalvar={onSalvar}
        onCancelar={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /salvar escala/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/selecione uma equipe/i);
    expect(onSalvar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/equipe/i), { target: { value: 'g1' } });
    fireEvent.click(screen.getByLabelText(/carlos silva/i));
    fireEvent.change(screen.getByLabelText(/observações/i), { target: { value: 'Turno reduzido' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar escala/i }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const salvo = onSalvar.mock.calls[0][0];
    expect(salvo.grupoEquipeId).toBe('g1');
    expect(salvo.observacaoGeral).toBe('Turno reduzido');
    expect(salvo.funcionarios.find((f: { id: string; escalado: boolean }) => f.id === 'f1')?.escalado).toBe(true);
  });

  it('consulta endpoint interceptado via MSW usando TanStack Query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    function StatusProbe() {
      const { data, isSuccess } = useQuery({
        queryKey: ['health-mock'],
        queryFn: async () => {
          const res = await fetch('/api/health-mock');
          return res.json() as Promise<{ ok: boolean; stack: string; provider: string }>;
        },
      });
      if (!isSuccess) return <span>carregando</span>;
      return <output>{`${data.stack}:${data.provider}`}</output>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <StatusProbe />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('AI-First ERP:supabase');
  });
});

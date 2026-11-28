import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { carregarPainelDev, type DadosPainelDev } from '../services/devAcessosApi';

export const PAINEL_DEV_QUERY_KEY = ['dev-acessos', 'painel'] as const;

export function usePainelDevQuery() {
  const queryClient = useQueryClient();
  const query = useQuery<DadosPainelDev, Error>({
    queryKey: PAINEL_DEV_QUERY_KEY,
    queryFn: carregarPainelDev,
    staleTime: 30_000,
    retry: 1,
  });

  const recarregar = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: PAINEL_DEV_QUERY_KEY });
    await query.refetch();
  }, [query, queryClient]);

  return {
    dados: query.data ?? null,
    carregando: query.isLoading || query.isFetching,
    erroConsulta: query.error?.message ?? '',
    recarregar,
  };
}

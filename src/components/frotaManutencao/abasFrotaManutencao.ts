import { BarChart3, ClipboardList, LayoutGrid, Wrench } from 'lucide-react';
import type { ItemDasAbas } from '../../shared/ui/AbasDaTela';
import type { FleetView } from '../ControleEquipamentosDiarioTab';
import type { Subtela as SubtelaManutencao } from '../ManutencaoTab';

/**
 * Aba única Frotas e Manutenção (pedido do Deivid em 23/11/2026): o que
 * ficava espalhado em Controle de Frotas (Dia, Quadro, Conferência,
 * Relatórios) e na aba Manutenção vira uma aba só, com quatro opções no
 * topo. A conferência da frota mora junto dos lançamentos do dia, e a
 * conferência das 10 h mora junto das ordens de serviço.
 */
export type VistaFrotaManutencao =
  | 'quadro'
  | 'dia'
  | 'equipamentos'
  | 'operadores'
  | 'motoristas'
  | 'parados'
  | 'ordens'
  | 'conferir-10h'
  | 'frota-dia'
  | 'fechamento'
  | 'manutencao-dia'
  | 'historico-os';

/** Subtela da frota que cada vista abre (undefined: é da manutenção). */
export const VISTA_DA_FROTA: Readonly<Partial<Record<VistaFrotaManutencao, FleetView>>> = {
  quadro: 'quadro',
  dia: 'today',
  equipamentos: 'equipamentos',
  operadores: 'operadores',
  motoristas: 'registry',
  'frota-dia': 'relatorio',
  fechamento: 'history',
};

/** Subtela da manutenção que cada vista abre (undefined: é da frota). */
export const VISTA_DA_MANUTENCAO: Readonly<Partial<Record<VistaFrotaManutencao, SubtelaManutencao>>> = {
  parados: 'hoje',
  ordens: 'ordens',
  'conferir-10h': 'conferencia',
  'manutencao-dia': 'relatorio',
  'historico-os': 'historico',
};

const inverter = <T extends string>(mapa: Partial<Record<VistaFrotaManutencao, T>>) =>
  Object.fromEntries(Object.entries(mapa).map(([vista, sub]) => [sub, vista])) as Record<T, VistaFrotaManutencao>;

export const VISTA_DE_FROTA = inverter<FleetView>(VISTA_DA_FROTA);
export const VISTA_DE_MANUTENCAO = inverter<SubtelaManutencao>(VISTA_DA_MANUTENCAO);

export interface ContadoresFrotaManutencao {
  equipamentosAConfirmar: number;
  operadoresAConfirmar: number;
  paradosAgora: number;
  paraConferir10h: number;
}

/** Quem só tem uma das duas permissões vê só a parte dela. */
export const abasFrotaManutencao = (
  acesso: { frota: boolean; manutencao: boolean },
  contadores: ContadoresFrotaManutencao,
): ItemDasAbas<VistaFrotaManutencao>[] => {
  const relatorios = [
    ...(acesso.frota ? [
      { id: 'frota-dia' as const, rotulo: 'Frota do dia', curto: 'Frota' },
      { id: 'fechamento' as const, rotulo: 'Fechamento por dia', curto: 'Por dia' },
    ] : []),
    ...(acesso.manutencao ? [
      { id: 'manutencao-dia' as const, rotulo: 'Manutenção do dia', curto: 'Manutenção' },
      { id: 'historico-os' as const, rotulo: 'Histórico das OS', curto: 'Histórico' },
    ] : []),
  ];
  return [
    ...(acesso.frota ? [
      { id: 'quadro' as const, rotulo: 'Quadro', icone: LayoutGrid },
      {
        grupo: 'lancamentos', rotulo: 'Lançamentos', icone: ClipboardList, abas: [
          { id: 'dia' as const, rotulo: 'Lançamentos do dia', curto: 'Do dia' },
          { id: 'equipamentos' as const, rotulo: 'Conferir equipamentos', curto: 'Equipamentos', contador: contadores.equipamentosAConfirmar, contadorRotulo: 'a confirmar' },
          { id: 'operadores' as const, rotulo: 'Conferir operadores', curto: 'Operadores', contador: contadores.operadoresAConfirmar, contadorRotulo: 'a confirmar' },
          { id: 'motoristas' as const, rotulo: 'Motoristas' },
        ],
      },
    ] : []),
    ...(acesso.manutencao ? [{
      grupo: 'manutencao', rotulo: 'Manutenção', icone: Wrench, abas: [
        { id: 'parados' as const, rotulo: 'Parados agora', curto: 'Parados', contador: contadores.paradosAgora, contadorRotulo: 'parados agora', tom: 'neutro' as const },
        { id: 'ordens' as const, rotulo: 'Ordens de serviço', curto: 'OS' },
        { id: 'conferir-10h' as const, rotulo: 'Conferir 10 h', curto: 'Conferir', contador: contadores.paraConferir10h, contadorRotulo: 'para conferir' },
      ],
    }] : []),
    ...(relatorios.length ? [{ grupo: 'relatorios', rotulo: 'Relatórios', icone: BarChart3, abas: relatorios }] : []),
  ];
};

/** Primeira vista que a pessoa pode abrir. */
export const vistaPadrao = (acesso: { frota: boolean; manutencao: boolean }): VistaFrotaManutencao =>
  (acesso.frota ? 'quadro' : 'parados');

export const vistaPermitida = (vista: VistaFrotaManutencao, acesso: { frota: boolean; manutencao: boolean }) =>
  (VISTA_DA_FROTA[vista] ? acesso.frota : acesso.manutencao);

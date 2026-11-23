import { BarChart3, ClipboardList, LayoutGrid, Wrench } from 'lucide-react';
import type { AbaDaTela } from '../../shared/ui/AbasDaTela';
import type { FleetView } from '../ControleEquipamentosDiarioTab';
import type { Subtela as SubtelaManutencao } from '../ManutencaoTab';

/**
 * Aba única Frotas e Manutenção (pedido do Deivid em 23/11/2026): quatro
 * opções no topo e nenhuma segunda linha de abas. Cada seção que tem mais de
 * uma tela mostra a escolha dentro da própria tela, em poucas palavras.
 * O que repetia saiu: "Conferir equipamentos" e "Conferir operadores" viraram
 * "Faltando"; o "Relatório do dia" da frota virou botão de baixar nos
 * Lançamentos; Motoristas foi para "Mais ações".
 */
export type SecaoFrotaManutencao = 'quadro' | 'lancamentos' | 'manutencao' | 'relatorios';

export type VistaFrotaManutencao =
  | 'quadro'
  | 'dia'
  | 'faltando'
  | 'motoristas'
  | 'parados'
  | 'ordens'
  | 'conferir-10h'
  | 'fechamento'
  | 'manutencao-dia'
  | 'historico-os';

/** Subtela da frota que cada vista abre (undefined: é da manutenção). */
export const VISTA_DA_FROTA: Readonly<Partial<Record<VistaFrotaManutencao, FleetView>>> = {
  quadro: 'quadro',
  dia: 'today',
  faltando: 'faltando',
  motoristas: 'registry',
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

export const SECAO_DA_VISTA: Readonly<Record<VistaFrotaManutencao, SecaoFrotaManutencao>> = {
  quadro: 'quadro',
  dia: 'lancamentos',
  faltando: 'lancamentos',
  motoristas: 'lancamentos',
  parados: 'manutencao',
  ordens: 'manutencao',
  'conferir-10h': 'manutencao',
  fechamento: 'relatorios',
  'manutencao-dia': 'relatorios',
  'historico-os': 'relatorios',
};

export interface ContadoresFrotaManutencao {
  /** Máquinas da relação do dia ainda sem lançamento. */
  faltando: number;
  paradosAgora: number;
  paraConferir10h: number;
}

type Acesso = { frota: boolean; manutencao: boolean };

export const vistaPermitida = (vista: VistaFrotaManutencao, acesso: Acesso) =>
  (VISTA_DA_FROTA[vista] ? acesso.frota : acesso.manutencao);

export interface OpcaoDaSecao {
  id: VistaFrotaManutencao;
  rotulo: string;
  /** Nome curto no celular, para as opções caberem lado a lado. */
  curto?: string;
  contador?: number;
}

/** As telas de cada seção, na ordem em que aparecem; quem não tem a permissão não vê. */
export const opcoesDaSecao = (secao: SecaoFrotaManutencao, acesso: Acesso, contadores: ContadoresFrotaManutencao): OpcaoDaSecao[] => {
  const todas: Record<SecaoFrotaManutencao, OpcaoDaSecao[]> = {
    quadro: [{ id: 'quadro', rotulo: 'Quadro' }],
    lancamentos: [
      { id: 'dia', rotulo: 'Lançados' },
      { id: 'faltando', rotulo: 'Faltando', contador: contadores.faltando },
    ],
    manutencao: [
      { id: 'parados', rotulo: 'Paradas de hoje', curto: 'Hoje', contador: contadores.paradosAgora },
      { id: 'ordens', rotulo: 'Ordens de serviço', curto: 'Ordens' },
      { id: 'conferir-10h', rotulo: 'Conferir 10 h', curto: 'Conferir', contador: contadores.paraConferir10h },
    ],
    relatorios: [
      { id: 'fechamento', rotulo: 'Frota por dia', curto: 'Frota' },
      { id: 'manutencao-dia', rotulo: 'Manutenção do dia', curto: 'Manutenção' },
      { id: 'historico-os', rotulo: 'Histórico das OS', curto: 'Histórico' },
    ],
  };
  return todas[secao].filter(opcao => vistaPermitida(opcao.id, acesso));
};

/** As opções do topo: no máximo quatro, sem segunda linha. */
export const abasFrotaManutencao = (
  acesso: Acesso,
  contadores: ContadoresFrotaManutencao,
): AbaDaTela<SecaoFrotaManutencao>[] => [
  { id: 'quadro' as const, rotulo: 'Quadro', icone: LayoutGrid },
  { id: 'lancamentos' as const, rotulo: 'Lançamentos', icone: ClipboardList, contador: contadores.faltando, contadorRotulo: 'máquinas faltando' },
  { id: 'manutencao' as const, rotulo: 'Manutenção', icone: Wrench, contador: contadores.paraConferir10h, contadorRotulo: 'para conferir' },
  { id: 'relatorios' as const, rotulo: 'Relatórios', icone: BarChart3 },
].filter(aba => opcoesDaSecao(aba.id, acesso, contadores).length > 0);

/** Primeira vista que a pessoa pode abrir. */
export const vistaPadrao = (acesso: Acesso): VistaFrotaManutencao =>
  (acesso.frota ? 'quadro' : 'parados');

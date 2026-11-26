import { ClipboardList, LayoutGrid, Wrench } from 'lucide-react';
import type { AbaDaTela, GrupoDeAbas, ItemDasAbas } from '../../shared/ui/AbasDaTela';
import type { FleetView } from '../ControleEquipamentosDiarioTab';
import type { Subtela as SubtelaManutencao } from '../ManutencaoTab';

/**
 * Aba única Frotas e Manutenção (pedido do Deivid em 23/11/2026): quatro
 * opções no topo e nenhuma segunda linha de abas.
 * O que repetia saiu: "Conferir equipamentos" e "Conferir operadores" viraram
 * "Faltando"; o que se imprime da frota fica nos cartões de "Relatórios da
 * frota" (24/11/2026); Motoristas foi para "Mais ações".
 */
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

export interface ContadoresFrotaManutencao {
  /** Máquinas da relação do dia ainda sem lançamento. */
  faltando: number;
  paradosAgora: number;
  paraConferir10h: number;
}

type Acesso = { frota: boolean; manutencao: boolean };

export const vistaPermitida = (vista: VistaFrotaManutencao, acesso: Acesso) =>
  (VISTA_DA_FROTA[vista] ? acesso.frota : acesso.manutencao);

/**
 * O topo, no padrão do site (docs/PADRAO_DO_SITE.md): no máximo quatro
 * opções. Manutenção é grupo: a tela se escolhe na caixinha "Ver" do
 * próprio AbasDaTela, na mesma linha. Os relatórios (fechamento da frota e
 * manutenção do dia) abrem só pela guia Relatórios (26/11/2026).
 * Lançamentos é a lista do dia; quem falta abre pela faixa "Falta lançar".
 * Quem não tem a permissão de uma parte não vê as telas dela.
 */
export const abasFrotaManutencao = (
  acesso: Acesso,
  contadores: ContadoresFrotaManutencao,
): ItemDasAbas<VistaFrotaManutencao>[] => {
  const pode = (aba: AbaDaTela<VistaFrotaManutencao>) => vistaPermitida(aba.id, acesso);
  const grupo = (item: GrupoDeAbas<VistaFrotaManutencao>): GrupoDeAbas<VistaFrotaManutencao> => ({ ...item, abas: item.abas.filter(pode) });
  const itens: ItemDasAbas<VistaFrotaManutencao>[] = [
    { id: 'quadro', rotulo: 'Quadro', icone: LayoutGrid },
    { id: 'dia', rotulo: 'Lançamentos', icone: ClipboardList, contador: contadores.faltando, contadorRotulo: 'máquinas faltando' },
    grupo({ grupo: 'manutencao', rotulo: 'Manutenção', icone: Wrench, abas: [
      // Parados agora é informação, não pendência: não soma no selo do grupo.
      { id: 'parados', rotulo: 'Paradas de hoje', contador: contadores.paradosAgora, contadorRotulo: 'parados agora', tom: 'neutro' },
      { id: 'ordens', rotulo: 'Ordens de serviço' },
      { id: 'conferir-10h', rotulo: 'Conferir 10 h', contador: contadores.paraConferir10h, contadorRotulo: 'para conferir' },
      { id: 'historico-os', rotulo: 'Histórico das OS' },
    ] }),
  ];
  return itens.filter(item => ('grupo' in item ? item.abas.length > 0 : pode(item)));
};

/** Todas as telas que a escolha do topo abre (Faltando e Motoristas abrem por dentro). */
export const telasDoTopo = (itens: readonly ItemDasAbas<VistaFrotaManutencao>[]): VistaFrotaManutencao[] =>
  itens.flatMap(item => ('grupo' in item ? item.abas.map(aba => aba.id) : [item.id]));

/** Faltando é parte de Lançamentos: no topo, a aba Lançamentos segue marcada. */
export const abaMarcada = (vista: VistaFrotaManutencao): VistaFrotaManutencao =>
  (vista === 'faltando' || vista === 'motoristas' ? 'dia' : vista);

/** Vistas que são relatório: abrem só pela guia Relatórios. */
export type ParteRelatorioFrota = 'fechamento' | 'manutencao-dia';
export const ehRelatorioDaFrota = (vista: VistaFrotaManutencao): vista is ParteRelatorioFrota =>
  vista === 'fechamento' || vista === 'manutencao-dia';

/** Primeira vista que a pessoa pode abrir. */
export const vistaPadrao = (acesso: Acesso): VistaFrotaManutencao =>
  (acesso.frota ? 'quadro' : 'parados');

/**
 * Frotas e Manutenção (pedido do Deivid em 23/11/2026): uma aba só no lugar
 * de Controle de Frotas e Manutenção. A moldura guarda a subtela aberta, o
 * dia e os selos; cada parte continua no seu componente
 * (ControleEquipamentosDiarioTab e ManutencaoTab), que recebe daqui as
 * mesmas abas do topo. Quadro e ordens se abrem um no outro sem trocar de
 * aba.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import ControleEquipamentosDiarioTab, { type ControleFrotaProps, type FleetView } from './ControleEquipamentosDiarioTab';
import ManutencaoTab, { type ManutencaoTabProps, type Subtela } from './ManutencaoTab';
import { AbasDaTela, idDaAba } from '../shared/ui/AbasDaTela';
import { montarConferenciaDoDia } from '../fleet/conferenciaDoDia';
import { getOperationalToday } from '../fleet/time';
import { dataDeHoje, diasParaConferir, registrosDeManutencao } from '../utils/conferenciaManutencao';
import { montarRelatorioManutencaoDia } from '../utils/relatorioManutencaoDia';
import {
  VISTA_DA_FROTA,
  VISTA_DA_MANUTENCAO,
  VISTA_DE_FROTA,
  VISTA_DE_MANUTENCAO,
  abaMarcada,
  abasFrotaManutencao,
  vistaPadrao,
  vistaPermitida,
  type VistaFrotaManutencao,
} from './frotaManutencao/abasFrotaManutencao';
import { AtalhoFaltando } from './frotaManutencao/AtalhoFaltando';

type FixasDaFrota = 'vista' | 'onVista' | 'abas' | 'idAbaAtiva' | 'diaInicial' | 'onDia' | 'onRelacaoMudou' | 'quadro' | 'quadroBusca' | 'onOpenMaintenance';
type FixasDaManutencao = 'subtela' | 'onSubtela' | 'abas' | 'idAbaAtiva' | 'buscaInicial' | 'onVerNoQuadro';

interface FrotaManutencaoProps {
  /** Sem a permissão de Controle de Frotas, a parte da frota some. */
  frota?: Omit<ControleFrotaProps, FixasDaFrota>;
  /** Sem a permissão de Manutenção, a parte da manutenção some. */
  manutencao?: Omit<ManutencaoTabProps, FixasDaManutencao>;
  quadro?: (dia: string, verSituacao: () => void, busca: string, verOrdens?: (prefixo: string) => void) => ReactNode;
  /** Vista pedida por outra tela (Painel, link antigo da Manutenção). */
  vistaInicial?: VistaFrotaManutencao;
}

const CHAVE_VISTA = 'renea_frota_manutencao_vista';
const ID_ABAS = 'frota';

const vistaGuardada = (): VistaFrotaManutencao | null => {
  try {
    const salva = window.localStorage.getItem(CHAVE_VISTA) as VistaFrotaManutencao | null;
    return salva && (VISTA_DA_FROTA[salva] || VISTA_DA_MANUTENCAO[salva]) ? salva : null;
  } catch {
    return null;
  }
};

export default function FrotaManutencao({ frota, manutencao, quadro, vistaInicial }: FrotaManutencaoProps) {
  const acesso = useMemo(() => ({ frota: Boolean(frota), manutencao: Boolean(manutencao) }), [frota, manutencao]);
  const [vista, setVistaState] = useState<VistaFrotaManutencao>(() => {
    const pedida = vistaInicial ?? vistaGuardada();
    return pedida && vistaPermitida(pedida, acesso) ? pedida : vistaPadrao(acesso);
  });
  const setVista = useCallback((proxima: VistaFrotaManutencao) => {
    setVistaState(proxima);
    try {
      window.localStorage.setItem(CHAVE_VISTA, proxima);
    } catch {
      // Sem memória do aparelho a escolha vale só nesta visita.
    }
  }, []);
  const [dia, setDia] = useState(getOperationalToday);
  const [buscaQuadro, setBuscaQuadro] = useState('');
  // Prefixo vindo do Quadro: a manutenção abre de novo já filtrando as ordens.
  const [pedidoOrdens, setPedidoOrdens] = useState({ prefixo: '', vez: 0 });
  const trocar = (proxima: VistaFrotaManutencao) => {
    if (proxima !== 'quadro') setBuscaQuadro('');
    if (proxima !== 'ordens' && pedidoOrdens.prefixo) setPedidoOrdens(atual => ({ ...atual, prefixo: '' }));
    setVista(proxima);
  };

  // As horas paradas correm com o relógio: o selo "parados agora" é refeito a cada minuto.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(relogio);
  }, []);
  const [versaoRelacao, setVersaoRelacao] = useState(0);
  const relacaoMudou = useCallback(() => setVersaoRelacao(versao => versao + 1), []);

  const registros = frota?.registros ?? manutencao?.controlesEquipamentos ?? [];
  const conferencia = useMemo(
    () => (frota ? montarConferenciaDoDia(frota.registros, dia) : null),
    // versaoRelacao: a relação vem do aparelho e muda sem passar pelos registros.
    [frota?.registros, dia, versaoRelacao],
  );
  // Depende só das ordens e dos registros: o objeto `manutencao` nasce de novo
  // a cada render do app e refazia a conta toda vez (24/11/2026).
  const ordensServico = manutencao?.ordensServico;
  const contadoresManutencao = useMemo(() => {
    if (!ordensServico) return { paradosAgora: 0, paraConferir10h: 0 };
    const doDia = registrosDeManutencao(registros);
    const relatorio = montarRelatorioManutencaoDia(dataDeHoje(agora), doDia, ordensServico, agora);
    return {
      paradosAgora: relatorio.linhas.filter(linha => linha.parada.periodos.some(periodo => periodo.fim === null)).length,
      paraConferir10h: diasParaConferir(doDia, ordensServico, agora).reduce((total, item) => total + item.aConferir, 0),
    };
  }, [ordensServico, registros, agora]);

  const contadores = { faltando: conferencia?.equipamentos.missing ?? 0, ...contadoresManutencao };
  // Topo no padrão do site: Manutenção e Relatórios escolhem a tela na
  // caixinha "Ver" do próprio AbasDaTela, na mesma linha, e voltar a um grupo
  // abre a última tela usada nele.
  const itensDoTopo = abasFrotaManutencao(acesso, contadores);
  const abas = (
    <AbasDaTela<VistaFrotaManutencao>
      id={ID_ABAS}
      rotulo="Subtelas de frotas e manutenção"
      abas={itensDoTopo}
      ativa={abaMarcada(vista)}
      onTrocar={trocar}
      idPainel={VISTA_DA_FROTA[vista] ? 'frota-dados' : 'manutencao-dados'}
      testId="frota-aba"
    />
  );
  // O botão marcado no topo: a própria aba, ou o do grupo quando ele tem mais de uma tela.
  const grupoDaVista = itensDoTopo.find(item => 'grupo' in item && item.abas.length > 1 && item.abas.some(aba => aba.id === vista));
  const idAbaAtiva = grupoDaVista && 'grupo' in grupoDaVista ? `${ID_ABAS}-grupo-${grupoDaVista.grupo}` : idDaAba(ID_ABAS, abaMarcada(vista));
  // Lançamentos: quem falta aparece numa faixa, sem segunda fileira de botões.
  const seletor = (
    <AtalhoFaltando
      vista={vista}
      maquinas={conferencia?.equipamentos.missing ?? 0}
      operadores={conferencia?.operadores.missing ?? 0}
      onTrocar={trocar}
    />
  );

  const verOrdens = manutencao ? (prefixo: string) => {
    setPedidoOrdens(atual => ({ prefixo, vez: atual.vez + 1 }));
    setVista('ordens');
  } : undefined;
  const verNoQuadro = frota ? (prefixo: string) => {
    setBuscaQuadro(prefixo);
    setVista('quadro');
  } : undefined;

  const vistaFrota = VISTA_DA_FROTA[vista];
  if (frota && vistaFrota) {
    return (
      <ControleEquipamentosDiarioTab
        {...frota}
        vista={vistaFrota}
        onVista={(proxima: FleetView) => trocar(VISTA_DE_FROTA[proxima])}
        abas={abas}
        seletor={seletor}
        idAbaAtiva={idAbaAtiva}
        diaInicial={dia}
        onDia={setDia}
        onRelacaoMudou={relacaoMudou}
        quadroBusca={buscaQuadro}
        quadro={quadro ? (diaDoQuadro, verSituacao, busca) => quadro(diaDoQuadro, verSituacao, busca, verOrdens) : undefined}
        onOpenMaintenance={manutencao ? () => trocar('parados') : undefined}
      />
    );
  }
  const subtela = VISTA_DA_MANUTENCAO[vista];
  if (manutencao && subtela) {
    return (
      <ManutencaoTab
        key={`ordens-${pedidoOrdens.vez}`}
        {...manutencao}
        subtela={subtela}
        onSubtela={(proxima: Subtela) => trocar(VISTA_DE_MANUTENCAO[proxima])}
        abas={abas}
        seletor={seletor}
        idAbaAtiva={idAbaAtiva}
        buscaInicial={pedidoOrdens.prefixo}
        onVerNoQuadro={verNoQuadro}
      />
    );
  }
  return null;
}

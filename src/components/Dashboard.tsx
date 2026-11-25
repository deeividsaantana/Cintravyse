import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Users } from 'lucide-react';
import type {
  Abastecimento, Comboio, ControleEquipamentoDiario, ControleEstacas, Empresa,
  Equipamento, FichaVerificacaoServico, FrenteServico, Funcionario, GrupoEquipe,
  HistoryLog, Inspecao, LancamentoCusto, ListaPresenca, Lubrificacao,
  Medicao, NaoConformidade, ObraLocal, OrcamentoItem,
  OrdemServico, PlanejamentoItem, PresencaApontamento, ProdutoLubrificacao,
  RegistroProducao, TipoCombustivel, DiarioObra,
} from '../types';
import type { Solicitacao } from '../utils/solicitacoes';
import { PageHeader, buildPeriod } from '../shared/ui';
import { TelaCheia } from '../shared/ui/TelaCheia';
import { buildDashboardGeneralViewModel } from '../utils/dashboardGeneral';
import { AvailabilityTrend, FleetDonut } from './dashboard/OperationalVisuals';
import { TeamActivity } from './dashboard/TeamActivity';
import { OBRA } from '../config/obra';

interface DashboardProps {
  empresas: Empresa[]; obras: ObraLocal[]; equipamentos: Equipamento[];
  funcionarios: Funcionario[]; comboios: Comboio[]; combustiveis: TipoCombustivel[];
  lubrificantes: ProdutoLubrificacao[]; abastecimentos: Abastecimento[];
  lubrificacoes: Lubrificacao[]; historyLogs: HistoryLog[];
  listasPresenca?: ListaPresenca[]; ordensServico?: OrdemServico[];
  estacas?: ControleEstacas;
  presencasLink?: PresencaApontamento[]; controlesEquipamentos?: ControleEquipamentoDiario[];
  gruposEquipe?: GrupoEquipe[]; planejamento?: PlanejamentoItem[];
  producao?: RegistroProducao[]; medicoes?: Medicao[];
  fichasFvs?: FichaVerificacaoServico[];
  inspecoes?: Inspecao[]; naoConformidades?: NaoConformidade[];
  lancamentosCusto?: LancamentoCusto[]; orcamento?: OrcamentoItem[];
  frentes?: FrenteServico[]; onNavigate: (tab: string) => void;
  diariosObra?: DiarioObra[]; solicitacoes?: Solicitacao[];
  /** Primeiro nome de quem entrou, para o "Bom dia" do topo. */
  nomePessoa?: string;
}

function ExecutiveCard({ label, value, detail, onClick }: { label: string; value: string | number; detail: string; onClick?: () => void }) {
  // Produção não tem tela própria desde que o Meu dia saiu: o cartão só mostra o número.
  const Elemento = onClick ? 'button' : 'div';
  // Mesmo desenho dos números das outras abas (CartaoIndicador, 25/11/2026):
  // rótulo pequeno e número firme, sem ícone.
  return <Elemento type={onClick ? 'button' : undefined} onClick={onClick} className="dashboard-kpi group flex min-w-0 flex-col justify-center bg-white p-4 text-left text-slate-950 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)">
    <span className="text-[13px] font-medium text-[#5b6870]">{label}</span>
    <strong className={`mt-1.5 block leading-none tabular-nums ${typeof value === 'number' || /\d/.test(value) ? 'text-2xl sm:text-[1.75rem] font-bold tracking-tight' : 'text-base font-bold text-slate-500'}`}>{value}</strong><span className="mt-1.5 block text-xs text-[#5b6870]">{detail}</span>
  </Elemento>;
}

/** "Bom dia, Deivid" conforme a hora; sem nome, só a saudação. */
function saudacao(nome?: string) {
  const hora = new Date().getHours();
  const parte = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? `${parte}, ${primeiro}` : parte;
}

function hojePorExtenso() {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Dashboard(props: DashboardProps) {
  // Cada abertura começa no retrato operacional do dia atual.
  const periodo = useMemo(() => buildPeriod('hoje'), []);
  const dashboardRef = useRef<HTMLElement>(null);
  // Entrada curta (150 ms, só opacidade), como o resto do padrão Cintravyse.
  useGSAP(() => {
    if (!dashboardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(dashboardRef.current.querySelectorAll('section'), { opacity: .6 }, { opacity: 1, duration: .15, ease: 'power1.out', clearProps: 'opacity' });
  }, { scope: dashboardRef, dependencies: [] });
  const view = useMemo(() => buildDashboardGeneralViewModel({ obraId: '', from: periodo.from, to: periodo.to }, props),
    [periodo.from, periodo.to, props.equipamentos, props.controlesEquipamentos, props.producao, props.abastecimentos, props.presencasLink, props.gruposEquipe, props.funcionarios, props.ordensServico]);
  const display = (value: number | null, unit = '') => value === null ? 'Sem registro' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}${unit ? ` ${unit}` : ''}`;

  // O Painel sempre mostra o retrato operacional do dia atual. O conteúdo
  // segue rolando por dentro da TelaCheia, sem um filtro redundante no topo.
  return (
    <TelaCheia ref={dashboardRef} id="dashboard-tab" rotulo="Visão geral" longa rotuloDados="Indicadores da operação"
      cabecalho={<PageHeader title={saudacao(props.nomePessoa)} description={`${hojePorExtenso()} · ${OBRA.nomeCurto}`} />}
    >
      <section className="renea-faixa-numeros grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Indicadores principais">
        <ExecutiveCard label="Frota em operação" value={view.fleet.confirmed ? view.fleet.operating : 'Sem posição'} detail={`${view.fleet.confirmed} posições confirmadas`} onClick={() => props.onNavigate('controle-equipamentos')} />
        <ExecutiveCard label="Disponibilidade" value={view.fleet.availability === null ? 'Sem posição' : `${display(view.fleet.availability)}%`} detail="sobre posições confirmadas" onClick={() => props.onNavigate('controle-equipamentos')} />
        <ExecutiveCard label="Produção" value={display(view.production.value, view.production.unit)} detail="lançamentos em m³" />
        <ExecutiveCard label="Presenças" value={display(view.presence.value)} detail="presenças registradas" onClick={() => props.onNavigate('presenca')} />
        <ExecutiveCard label="OS abertas" value={display(view.maintenance.value)} detail="pendências da frota" onClick={() => props.onNavigate('manutencao')} />
        <ExecutiveCard label="Combustível" value={display(view.fuel.value, view.fuel.unit)} detail="abastecimentos no período" onClick={() => props.onNavigate('lancamentos')} />
      </section>

      <div className="grid min-w-0 grid-flow-dense gap-4 xl:grid-cols-2" aria-label="Visualização da operação">
        <FleetDonut fleet={view.fleet} onNavigate={() => props.onNavigate('controle-equipamentos')} />
        <AvailabilityTrend measure={view.availability} onNavigate={() => props.onNavigate('controle-equipamentos')} />
      </div>

      <section className="renea-faixa-numeros grid-cols-2 sm:grid-cols-4" aria-label="Módulos operacionais">
        <ExecutiveCard label="Pluviômetro" value={props.diariosObra?.length ?? 0} detail="registros disponíveis" onClick={() => props.onNavigate('pluviometro')} />
        <ExecutiveCard label="Estacas" value={props.estacas ? 'Ativo' : 'Sem dados'} detail="controle de cravações" onClick={() => props.onNavigate('estacas')} />
        <ExecutiveCard label="Solicitações" value={props.solicitacoes?.length ?? 0} detail="pedidos cadastrados" onClick={() => props.onNavigate('solicitacoes')} />
        <ExecutiveCard label="Cadastros" value={props.funcionarios.length + props.equipamentos.length} detail="pessoas e equipamentos" onClick={() => props.onNavigate('cadastros')} />
      </section>

      <TeamActivity view={view} onNavigate={props.onNavigate} />

    </TelaCheia>
  );
}

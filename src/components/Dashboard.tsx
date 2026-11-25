import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronRight } from 'lucide-react';
import type {
  Abastecimento, Comboio, ControleEquipamentoDiario, ControleEstacas, Empresa,
  Equipamento, FichaVerificacaoServico, FrenteServico, Funcionario, GrupoEquipe,
  HistoryLog, Inspecao, LancamentoCusto, ListaPresenca, Lubrificacao,
  Medicao, NaoConformidade, ObraLocal, OrcamentoItem,
  OrdemServico, PlanejamentoItem, PresencaApontamento, ProdutoLubrificacao,
  RegistroProducao, TipoCombustivel, DiarioObra,
} from '../types';
import { situacaoDe, type Solicitacao } from '../utils/solicitacoes';
import { PageHeader, buildPeriod } from '../shared/ui';
import { TelaCheia } from '../shared/ui/TelaCheia';
import { buildDashboardGeneralViewModel } from '../utils/dashboardGeneral';
import { FleetDonut } from './dashboard/OperationalVisuals';
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

  // Lista curta do que pede ação hoje. Só entra o que tem número maior que
  // zero; cada linha abre a tela onde se resolve.
  const hoje = periodo.to;
  const pedidosAtrasados = (props.solicitacoes ?? []).filter(sol => situacaoDe(sol, hoje) === 'Em Atraso').length;
  const pedidosParaAprovar = (props.solicitacoes ?? []).filter(sol => sol.etapa === 'Aguardando Aprovação').length;
  const equipesSemEnvio = view.teams.total - view.teams.withRecords;
  const pendencias = [
    { id: 'frota', quantos: view.fleet.pending, texto: 'máquinas sem lançamento hoje', tela: 'controle-equipamentos' },
    { id: 'os', quantos: view.maintenance.value ?? 0, texto: 'ordens de serviço abertas', tela: 'manutencao' },
    { id: 'equipes', quantos: equipesSemEnvio, texto: 'equipes ainda sem presença hoje', tela: 'presenca' },
    { id: 'atrasados', quantos: pedidosAtrasados, texto: 'pedidos de compra em atraso', tela: 'solicitacoes' },
    { id: 'aprovar', quantos: pedidosParaAprovar, texto: 'pedidos esperando aprovação', tela: 'solicitacoes' },
  ].filter(item => item.quantos > 0);

  // O Painel mostra o retrato do dia: quatro números, o que pede atenção e
  // a frota. Sem título repetido (o caminho do topo já diz "Visão geral") e
  // sem segunda faixa de atalhos (o menu já leva a cada tela).
  return (
    <TelaCheia ref={dashboardRef} id="dashboard-tab" rotulo="Visão geral" longa rotuloDados="Indicadores da operação"
      cabecalho={<PageHeader title="Visão geral" />}
    >
      <p className="cv-saudacao"><strong>{saudacao(props.nomePessoa)}</strong><span>{hojePorExtenso()} · {OBRA.nomeCurto}</span></p>

      <section className="renea-faixa-numeros grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <ExecutiveCard label="Frota em operação" value={view.fleet.confirmed ? view.fleet.operating : 'Sem posição'} detail={view.fleet.availability === null ? `${view.fleet.confirmed} posições confirmadas` : `${display(view.fleet.availability)}% de disponibilidade`} onClick={() => props.onNavigate('controle-equipamentos')} />
        <ExecutiveCard label="Presentes hoje" value={display(view.presence.value)} detail="pessoas com presença" onClick={() => props.onNavigate('presenca')} />
        <ExecutiveCard label="Diesel hoje" value={display(view.fuel.value, view.fuel.unit)} detail="abastecimentos do dia" onClick={() => props.onNavigate('lancamentos')} />
        <ExecutiveCard label="OS abertas" value={display(view.maintenance.value)} detail="ordens da frota" onClick={() => props.onNavigate('manutencao')} />
      </section>

      <div className="cv-painel">
        <section className="cv-bloco" aria-labelledby="painel-atencao">
          <header className="cv-bloco__topo"><h2 id="painel-atencao">Precisa de atenção</h2>{pendencias.length > 0 && <span>{pendencias.length}</span>}</header>
          {pendencias.length ? <ul className="cv-pendencias">
            {pendencias.map(item => <li key={item.id}><button type="button" onClick={() => props.onNavigate(item.tela)}>
              <b>{item.quantos}</b><span>{item.texto}</span><ChevronRight aria-hidden="true" />
            </button></li>)}
          </ul> : <p className="cv-bloco__vazio">Nada pendente agora.</p>}
        </section>
        <FleetDonut fleet={view.fleet} onNavigate={() => props.onNavigate('controle-equipamentos')} />
      </div>

      <TeamActivity view={view} onNavigate={props.onNavigate} />
    </TelaCheia>
  );
}

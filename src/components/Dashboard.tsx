import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarRange,
  ChevronRight,
  Fuel,
  Hammer,
  Plus,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
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
  nomePessoa?: string;
}

type TomKpi = 'verde' | 'azul' | 'laranja' | 'neutro';

const TONS_KPI: Record<TomKpi, { borda: string; iconeBg: string; valor: string }> = {
  verde: { borda: 'border-l-[#176b4d]', iconeBg: 'bg-emerald-50 text-[#176b4d]', valor: 'text-slate-900' },
  azul: { borda: 'border-l-sky-700', iconeBg: 'bg-sky-50 text-sky-700', valor: 'text-slate-900' },
  laranja: { borda: 'border-l-[#c2410c]', iconeBg: 'bg-orange-50 text-[#c2410c]', valor: 'text-[#c2410c]' },
  neutro: { borda: 'border-l-slate-500', iconeBg: 'bg-slate-100 text-slate-600', valor: 'text-slate-600' },
};

function ExecutiveKpiCard({
  label,
  value,
  detail,
  tom,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  tom: TomKpi;
  icon: typeof Truck;
  onClick?: () => void;
}) {
  const temDado = typeof value === 'number' || /\d/.test(value);
  const estilo = TONS_KPI[temDado ? tom : 'neutro'];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 border-l-[3px] ${estilo.borda} bg-white px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(11,27,22,0.05)] transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-">{label}</span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${estilo.iconeBg}`}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <strong className={`block leading-none tracking-[-0.025em] tabular-nums ${temDado ? `text-[1.45rem] font-semibold ${estilo.valor}` : 'text-[14px] font-medium text-slate-500'}`}>
          {value}
        </strong>
        <ArrowUpRight className="size-3.5 shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
      <span className="mt-1.5 block truncate text-xs text-">{detail}</span>
    </button>
  );
}

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
  const periodo = useMemo(() => buildPeriod('hoje'), []);
  const dashboardRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!dashboardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      dashboardRef.current.querySelectorAll('[data-painel-bloco]'),
      { opacity: 0.7, y: 6 },
      { opacity: 1, y: 0, duration: 0.22, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }, { scope: dashboardRef, dependencies: [] });

  const view = useMemo(
    () => buildDashboardGeneralViewModel({ obraId: '', from: periodo.from, to: periodo.to }, props),
    [periodo.from, periodo.to, props.equipamentos, props.controlesEquipamentos, props.producao, props.abastecimentos, props.presencasLink, props.gruposEquipe, props.funcionarios, props.ordensServico],
  );

  const display = (value: number | null, unit = '') =>
    value === null ? 'Sem registro' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}${unit ? ` ${unit}` : ''}`;

  const hoje = periodo.to;
  const pedidosAtrasados = (props.solicitacoes ?? []).filter(sol => situacaoDe(sol, hoje) === 'Em Atraso').length;
  const pedidosParaAprovar = (props.solicitacoes ?? []).filter(sol => sol.etapa === 'Aguardando Aprovação').length;
  const equipesSemEnvio = view.teams.total - view.teams.withRecords;

  const pendencias = [
    { id: 'os', quantos: view.maintenance.value ?? 0, texto: 'ordens de serviço abertas', tela: 'manutencao', critico: true },
    { id: 'atrasados', quantos: pedidosAtrasados, texto: 'pedidos de compra em atraso', tela: 'solicitacoes', critico: true },
    { id: 'frota', quantos: view.fleet.pending, texto: 'máquinas sem lançamento hoje', tela: 'controle-equipamentos', critico: false },
    { id: 'equipes', quantos: equipesSemEnvio, texto: 'equipes ainda sem presença hoje', tela: 'presenca', critico: false },
    { id: 'aprovar', quantos: pedidosParaAprovar, texto: 'pedidos esperando aprovação', tela: 'solicitacoes', critico: false },
  ].filter(item => item.quantos > 0);

  const atalhosTurno = [
    { id: 'presenca', titulo: 'Presença', desc: 'Apontar equipes', icone: Users, tela: 'presenca' },
    { id: 'frota', titulo: 'Frotas', desc: 'Posição diária', icone: Truck, tela: 'controle-equipamentos' },
    { id: 'combustivel', titulo: 'Combustível', desc: 'Lançar diesel', icone: Fuel, tela: 'lancamentos' },
    { id: 'programacao', titulo: 'Programação', desc: 'Cronograma', icone: CalendarRange, tela: 'programacao' },
    { id: 'estacas', titulo: 'Estacas', desc: 'Cravações', icone: Hammer, tela: 'estacas' },
    { id: 'compras', titulo: 'Compras', desc: 'Solicitações', icone: ShoppingCart, tela: 'solicitacoes' },
  ];

  return (
    <TelaCheia
      ref={dashboardRef}
      id="dashboard-tab"
      rotulo="Visão geral"
      longa
      rotuloDados="Indicadores da operação"
      cabecalho={<PageHeader title="Visão geral" />}
    >
      {/* Faixa de comando Floresta: identidade editorial com ações imediatas do turno */}
      <section
        data-painel-bloco
        aria-label="Comando da obra"
        className="cv-hero-floresta flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-emerald-200">
            <span className="inline-block size-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span>{OBRA.nomeCurto}</span>
            <span aria-hidden="true">·</span>
            <span>{hojePorExtenso()}</span>
          </div>
          <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-white">
            {saudacao(props.nomePessoa)}
          </h2>
          <p className="text-[12.5px] text-emerald-100">
            {view.teams.withRecords} de {view.teams.total} equipes confirmadas hoje · {pendencias.length} frente{pendencias.length === 1 ? '' : 's'} pedindo atenção
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => props.onNavigate('presenca')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-[12.5px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-50"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Lançar presença
          </button>
          <button
            type="button"
            onClick={() => props.onNavigate('controle-equipamentos')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
          >
            <Truck className="size-3.5" aria-hidden="true" />
            Frotas
          </button>
          <button
            type="button"
            onClick={() => props.onNavigate('solicitacoes')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
          >
            <ShoppingCart className="size-3.5" aria-hidden="true" />
            Nova solicitação
          </button>
        </div>
      </section>

      {/* Layout executivo 2 colunas: operação à esquerda + triagem persistente à direita */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <section data-painel-bloco className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores principais">
            <ExecutiveKpiCard
              label="Frota em operação"
              value={view.fleet.confirmed ? view.fleet.operating : 'Sem posição'}
              detail={view.fleet.availability === null ? `${view.fleet.confirmed} posições confirmadas` : `${display(view.fleet.availability)}% disponível`}
              tom="verde"
              icon={Truck}
              onClick={() => props.onNavigate('controle-equipamentos')}
            />
            <ExecutiveKpiCard
              label="Presentes hoje"
              value={display(view.presence.value)}
              detail={`${view.teams.withRecords} de ${view.teams.total} equipes`}
              tom="verde"
              icon={Users}
              onClick={() => props.onNavigate('presenca')}
            />
            <ExecutiveKpiCard
              label="Diesel hoje"
              value={display(view.fuel.value, view.fuel.unit)}
              detail="abastecimentos do dia"
              tom="azul"
              icon={Fuel}
              onClick={() => props.onNavigate('lancamentos')}
            />
            <ExecutiveKpiCard
              label="OS abertas"
              value={display(view.maintenance.value)}
              detail="ordens da frota"
              tom={(view.maintenance.value ?? 0) > 0 ? 'laranja' : 'verde'}
              icon={Wrench}
              onClick={() => props.onNavigate('manutencao')}
            />
          </section>

          <div data-painel-bloco>
            <TeamActivity view={view} onNavigate={props.onNavigate} />
          </div>
        </div>

        {/* Trilho direito persistente: triagem de alertas + telemetria de frota + atalhos */}
        <aside className="min-w-0 space-y-4" aria-label="Triagem e atalhos do turno">
          <section data-painel-bloco className="cv-bloco" aria-labelledby="painel-atencao">
            <header className="cv-bloco__topo">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-[#c2410c]" aria-hidden="true" />
                <h2 id="painel-atencao">Atenção agora</h2>
              </div>
              {pendencias.length > 0 && <span>{pendencias.length}</span>}
            </header>
            {pendencias.length ? (
              <ul className="space-y-1.5">
                {pendencias.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => props.onNavigate(item.tela)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        item.critico
                          ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <b className={`inline-grid min-w-7 shrink-0 place-items-center rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums ${
                          item.critico ? 'bg-[#c2410c] text-white' : 'bg-orange-50 text-[#c2410c]'
                        }`}>
                          {item.quantos}
                        </b>
                        <span className="truncate text-[12.5px] font-medium text-slate-900">{item.texto}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cv-bloco__vazio">Nada pendente agora.</p>
            )}
          </section>

          <div data-painel-bloco>
            <FleetDonut fleet={view.fleet} onNavigate={() => props.onNavigate('controle-equipamentos')} />
          </div>

          <section data-painel-bloco className="cv-bloco" aria-label="Atalhos rápidos do turno">
            <header className="cv-bloco__topo">
              <h2>Atalhos do turno</h2>
            </header>
            <div className="grid grid-cols-2 gap-2">
              {atalhosTurno.map(item => {
                const Icone = item.icone;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => props.onNavigate(item.tela)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition-colors hover:border-[#176b4d] hover:bg-emerald-50"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#176b4d]">
                      <Icone className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[12px] font-semibold text-slate-900">{item.titulo}</strong>
                      <span className="block truncate text-xs text-">{item.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </TelaCheia>
  );
}

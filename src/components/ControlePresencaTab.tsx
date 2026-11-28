import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { NomeComAvatar } from './perfil/NomeComAvatar';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Radio,
  RotateCcw,
  Search,
  Undo2,
  X,
  Link2,
} from 'lucide-react';
import { CartaoIndicador, ConfirmDialog, Modal, PageHeader } from '../shared/ui';
import { AbasDaTela, idDaAba, type ItemDasAbas } from '../shared/ui/AbasDaTela';
import { VoltarAosRelatorios, type ModoRelatorio } from '../shared/ui/RelatorioNaAba';
import { TelaCheia } from '../shared/ui/TelaCheia';
import { MaisAcoes } from '../shared/ui/MaisAcoes';
import LinkPresenca from './cadastros/LinkPresenca';
import { TabelaPadrao, type ColunaTabela } from '../shared/ui/TabelaPadrao';
import { normalizeComparable } from '../utils/canonicalIdentity';
import { readableTeamText, recoverTeamGroups, teamRecordMatches } from '../utils/teamIdentity';
import type { SituacaoLancada } from '../utils/presencaManual';
import {
  AFASTAMENTOS_PREVISTOS,
  diasAntes,
  efetivoPorEmpresa,
  efetivoPorFrente,
  faltasRepetidas,
} from '../utils/painelPresenca';
import { CANTEIROS_ATIVOS, RAMOS_ATIVOS, contemTermo } from '../utils/frenteServico';
import RelatoriosPresenca from './presenca/RelatoriosPresenca';
import { EscalaSabado } from './presenca/EscalaSabado';
import reneaLogo from '../assets/images/logo-renea-dark.svg';
import { addCorporateSummarySheet, configureCorporateWorkbook, createCorporateWorkbook, downloadCorporateWorkbook, styleCorporateWorksheet } from '../utils/excelCorporate';
import { generateUniversalPdfReport } from '../utils/universalPdfReport';
import { imprimirEmUmaFolha } from '../utils/imprimirEmUmaFolha';
import { useAtalhoNovo } from '../shared/hooks/useAtalhoNovo';
import { saveSaturdayScale } from '../publicApi';
import type {
  Empresa,
  Funcionario,
  GrupoEquipe,
  HistoricoPresenca,
  ObraLocal,
  PresencaApontamento,
  PresencaStatus,
} from '../types';

const STATUS_OPTIONS: PresencaStatus[] = [
  'Presente',
  'Atraso',
  'Saída antecipada',
  'Ausente',
  'Falta justificada',
  'Atestado',
  'Férias',
  'Baixada',
  'Recesso',
  'Afastado',
  'Desligado',
  'Outro',
];

const ACTIVE_BRANCHES: readonly string[] = RAMOS_ATIVOS;
const ACTIVE_SITES: readonly string[] = CANTEIROS_ATIVOS;

const STATUS_STYLES: Record<PresencaStatus, string> = {
  Presente: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Atraso: 'border-amber-200 bg-amber-50 text-amber-800',
  'Saída antecipada': 'border-amber-200 bg-amber-50 text-amber-800',
  Ausente: 'border-rose-200 bg-rose-50 text-rose-800',
  'Falta justificada': 'border-amber-200 bg-amber-50 text-amber-800',
  Atestado: 'border-sky-200 bg-sky-50 text-sky-800',
  // Afastamento previsto: mesma família visual, para o olho já saber que não
  // é falta antes de ler o texto.
  Férias: 'border-stone-200 bg-stone-100 text-stone-700',
  Baixada: 'border-stone-200 bg-stone-100 text-stone-700',
  Recesso: 'border-stone-200 bg-stone-100 text-stone-700',
  Afastado: 'border-orange-200 bg-orange-50 text-orange-800',
  Desligado: 'border-slate-300 bg-slate-100 text-slate-700',
  Outro: 'border-violet-200 bg-violet-50 text-violet-800',
};

const PANEL = 'rounded-xl border border-slate-200 bg-white';
const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--renea-focus)';
const ROTULO_CAMPO = 'block text-xs font-bold text-[#5b6870]';
const FIELD = 'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10';
const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${FOCO}`;
const PRIMARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176b4d] px-4 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${FOCO}`;

interface ControlePresencaTabProps {
  empresas: Empresa[];
  funcionarios: Funcionario[];
  obras: ObraLocal[];
  /** Canteiros do cadastro; sem isso usa a lista fixa de reserva. */
  canteiros?: readonly string[];
  gruposEquipe: GrupoEquipe[];
  presencasLink: PresencaApontamento[];
  historicoPresencas: HistoricoPresenca[];
  onUpdatePresencaLink: (id: string, status: PresencaStatus, observacao: string, motivo: string) => void;
  /** Lançar a presença de uma equipe que não usou o link. */
  onLancarPresencaManual?: (
    grupo: GrupoEquipe,
    data: string,
    situacoes: SituacaoLancada[],
    observacaoDia: string,
  ) => void;
  /** Registros inativados, para ver e reativar. */
  presencasInativas?: PresencaApontamento[];
  /** Inativa (não apaga): sai das telas e dos relatórios e volta com Reativar. */
  onInativarPresencaLink?: (ids: string[]) => void;
  onReativarPresencaLink?: (ids: string[]) => void;
  /** Apaga os envios e a reserva do dia, liberando um novo apontamento. */
  onResetPresencaDia?: (grupoId: string, data: string) => Promise<{ success: boolean; message: string }>;
  /**
   * Envios do link público que já chegaram no Supabase mas ainda não foram
   * incorporados a este retrato local. Um número maior que zero por muito
   * tempo indica que o processamento em tempo real travou, mesmo sem erro
   * visível — o dado existe, só não foi puxado para cá ainda.
   */
  pendingPublicSubmissionsCount?: number;
  /**
   * Reconstrói o histórico de presença a partir dos envios originais do link
   * público (nunca apagados), para trazer de volta dias que sumiram do
   * retrato consolidado sem apagar nada que já esteja presente.
   */
  onRestorePresenceHistory?: () => Promise<{ success: boolean; message: string }>;
  /** Aberta pela guia Relatórios: só o resumo, com o voltar. */
  relatorio?: ModoRelatorio;
  /** Link geral de presença (só o administrador), aberto por "Mais ações". */
  ehAdmin?: boolean;
  /** Grava só o token do link numa equipe que já existe; equipe nova ou excluída só em Cadastros (A29). */
  onSalvarLinkDaEquipe?: (grupo: GrupoEquipe) => void;
  /** Leva para Cadastros > Equipes, a única tela onde as equipes se criam e se editam. */
  onGerenciarEquipes?: () => void;
}

type View = 'ao-vivo' | 'relatorios' | 'registros' | 'historico' | 'link';

const localToday = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const safeText = readableTeamText;
const safeIds = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [];

const normalizeGroup = (group: GrupoEquipe): GrupoEquipe => ({
  ...group,
  id: safeText(group?.id),
  nome: safeText(group?.nome),
  responsavel: safeText(group?.responsavel),
  frenteServico: safeText(group?.frenteServico),
  obraId: safeText(group?.obraId),
  funcionarioIds: safeIds(group?.funcionarioIds),
  funcionarioMatriculas: safeIds(group?.funcionarioMatriculas),
  token: safeText(group?.token),
  tokenGeral: safeText(group?.tokenGeral) || undefined,
  status: group?.status === 'inativo' ? 'inativo' : 'ativo',
  linkAtivo: group?.linkAtivo !== false,
  createdAt: safeText(group?.createdAt),
  updatedAt: safeText(group?.updatedAt),
});

const normalizeRecord = (record: PresencaApontamento): PresencaApontamento => ({
  ...record,
  id: safeText(record?.id),
  data: safeText(record?.data),
  horaEnvio: safeText(record?.horaEnvio),
  grupoId: safeText(record?.grupoId),
  grupoNome: safeText(record?.grupoNome),
  responsavel: safeText(record?.responsavel),
  frenteServico: safeText(record?.frenteServico),
  funcionarioId: safeText(record?.funcionarioId),
  funcionarioNome: safeText(record?.funcionarioNome),
  funcao: safeText(record?.funcao),
  observacao: safeText(record?.observacao),
  status: STATUS_OPTIONS.includes(record?.status) ? record.status : 'Outro',
});

const presenceLink = (token: string) => `${window.location.origin}/presenca-link/${encodeURIComponent(token)}`;
const duplicateKey = (record: PresencaApontamento) => `${record.grupoId}|${record.data}|${record.funcionarioId}`;

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const dataBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** "2026-09-03T14:05:00.000Z" vira "03/09/2026 11:05"; texto que não é data fica como veio. */
const quandoBr = (valor: string) => {
  const data = new Date(valor);
  if (!valor || Number.isNaN(data.getTime())) return valor || '—';
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const toCsv = (rows: Array<Array<string | number>>) => rows
  .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
  .join('\n');

export default function ControlePresencaTab({
  empresas = [],
  funcionarios = [],
  obras = [],
  canteiros = ACTIVE_SITES,
  gruposEquipe = [],
  presencasLink = [],
  historicoPresencas = [],
  onUpdatePresencaLink,
  onLancarPresencaManual,
  presencasInativas = [],
  onInativarPresencaLink,
  onReativarPresencaLink,
  onResetPresencaDia,
  pendingPublicSubmissionsCount = 0,
  onRestorePresenceHistory,
  relatorio,
  onGerenciarEquipes,
  ehAdmin = false,
  onSalvarLinkDaEquipe,
}: ControlePresencaTabProps) {
  const today = localToday();
  const safeFuncionarios = useMemo(() => (Array.isArray(funcionarios) ? funcionarios : []).filter(Boolean), [funcionarios]);
  const safeEmpresas = useMemo(() => (Array.isArray(empresas) ? empresas : []).filter(Boolean), [empresas]);
  const safeObras = useMemo(() => (Array.isArray(obras) ? obras : []).filter(Boolean), [obras]);
  const safeRecords = useMemo(() => (Array.isArray(presencasLink) ? presencasLink : []).filter(Boolean).map(normalizeRecord), [presencasLink]);
  const inativos = useMemo(() => (Array.isArray(presencasInativas) ? presencasInativas : []).filter(Boolean).map(normalizeRecord), [presencasInativas]);
  const safeGroups = useMemo(() => recoverTeamGroups(
    (Array.isArray(gruposEquipe) ? gruposEquipe : []).filter(Boolean).map(normalizeGroup),
    safeRecords,
    safeFuncionarios,
  ), [gruposEquipe, safeFuncionarios, safeRecords]);
  const safeHistory = useMemo(() => (Array.isArray(historicoPresencas) ? historicoPresencas : []).filter(Boolean), [historicoPresencas]);

  const [view, setView] = useState<View>(relatorio ? 'relatorios' : 'ao-vivo');
  const [referenceDate, setReferenceDate] = useState(today);
  const [dashboardCompany, setDashboardCompany] = useState('todas');
  const [dashboardGroup, setDashboardGroup] = useState('todos');
  const [dashboardRole, setDashboardRole] = useState('todas');
  const [dashboardStatus, setDashboardStatus] = useState<'todos' | PresencaStatus>('todos');
  const [dashboardBranch, setDashboardBranch] = useState('todos');
  const [dashboardSite, setDashboardSite] = useState('todos');
  const [dashboardSearch, setDashboardSearch] = useState('');
  // A gaveta de filtros nasce fechada em todo aparelho: a tela abre mostrando
  // gente, não formulário (pedido de 10/11/2026, só o essencial à vista).
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [recordDate, setRecordDate] = useState(today);
  const [recordGroup, setRecordGroup] = useState('todos');
  const [recordStatus, setRecordStatus] = useState<'todos' | PresencaStatus>('todos');
  const [recordSearch, setRecordSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editingRecord, setEditingRecord] = useState<PresencaApontamento | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  /** Lista mostra os inativados, para reativar. */
  const [verInativos, setVerInativos] = useState(false);
  /** Últimos inativados, para o Desfazer do aviso. */
  const [desfazerInativacao, setDesfazerInativacao] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<PresencaStatus>('Presente');
  const [editObservation, setEditObservation] = useState('');
  const [editReason, setEditReason] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [confirmandoInativacao, setConfirmandoInativacao] = useState(false);
  const [resumoZerarDia, setResumoZerarDia] = useState<{ equipe: string; quantos: number } | null>(null);
  const [restoringHistory, setRestoringHistory] = useState(false);
  // Lançamento manual: equipe escolhida, dia, e a situação de cada um.
  const [lancamento, setLancamento] = useState<{ grupoId: string; data: string; observacaoDia: string } | null>(null);
  const [situacoesLancadas, setSituacoesLancadas] = useState<Record<string, SituacaoLancada>>({});

  // Task 8: EscalaSabado modal state
  const [mostrarEscalaSabado, setMostrarEscalaSabado] = useState(false);

  // O crachá no botão diz quantos recortes estão valendo: sem abrir a gaveta,
  // dá para saber se o número na tela é o efetivo todo ou um pedaço dele.
  const filtrosAtivos = [
    dashboardCompany !== 'todas',
    dashboardGroup !== 'todos',
    dashboardRole !== 'todas',
    dashboardStatus !== 'todos',
    dashboardBranch !== 'todos',
    dashboardSite !== 'todos',
    dashboardSearch.trim() !== '',
  ].filter(Boolean).length;

  const abrirLancamento = (grupoId: string, data = referenceDate) => {
    // A lista já vem com o que a equipe tem hoje: quem estiver apontado no dia
    // aparece com a situação atual, para o lançamento ser correção e não
    // recomeço.
    const jaApontado = new Map(
      dayRecords.filter(item => item.grupoId === grupoId).map(item => [item.funcionarioId, item]),
    );
    const grupo = safeGroups.find(item => item.id === grupoId);
    const inicial: Record<string, SituacaoLancada> = {};
    (grupo?.funcionarioIds || []).forEach(id => {
      const atual = jaApontado.get(id);
      if (atual) inicial[id] = { funcionarioId: id, status: atual.status, observacao: atual.observacao };
    });
    setSituacoesLancadas(inicial);
    setLancamento(atual => ({ grupoId, data, observacaoDia: atual?.observacaoDia ?? '' }));
  };
  // N abre o lançamento de presença (padrão de lançamento, 15/11/2026).
  useAtalhoNovo(() => abrirLancamento(''), Boolean(onLancarPresencaManual) && !lancamento);

  const limparFiltrosPainel = () => {
    setDashboardCompany('todas');
    setDashboardGroup('todos');
    setDashboardRole('todas');
    setDashboardStatus('todos');
    setDashboardBranch('todos');
    setDashboardSite('todos');
    setDashboardSearch('');
  };
  const liveViewRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLElement>(null);

  const activeGroups = useMemo(
    () => safeGroups.filter(group => group.status === 'ativo' && group.linkAtivo),
    [safeGroups],
  );
  const dayRecords = useMemo(() => safeRecords.filter(record => record.data === referenceDate), [referenceDate, safeRecords]);
  const roleOptions = useMemo(() => [...new Set(safeRecords.map(record => record.funcao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [safeRecords]);
  const employeeById = useMemo(() => new Map(safeFuncionarios.map(employee => [employee.id, employee])), [safeFuncionarios]);
  const buscaPainel = normalizeComparable(dashboardSearch.trim());
  const recordMatchesDashboard = (record: PresencaApontamento) => {
    const employee = employeeById.get(record.funcionarioId);
    const operationalLocation = `${record.grupoNome} ${record.frenteServico}`.toLocaleLowerCase('pt-BR');
    return (dashboardCompany === 'todas' || employee?.empresaId === dashboardCompany)
      && (dashboardGroup === 'todos' || activeGroups.some(group => group.id === dashboardGroup && teamRecordMatches(group, record)))
      && (dashboardRole === 'todas' || record.funcao === dashboardRole)
      && (dashboardStatus === 'todos' || record.status === dashboardStatus)
      && (dashboardBranch === 'todos' || contemTermo(operationalLocation, dashboardBranch))
      && (dashboardSite === 'todos' || contemTermo(operationalLocation, dashboardSite))
      // Procurar uma pessoa pelo nome ou matrícula é o filtro que mais falta
      // quando alguém liga perguntando "o fulano bateu hoje?".
      && (!buscaPainel || normalizeComparable(
        `${record.funcionarioNome} ${employee?.matricula || ''} ${record.funcao}`,
      ).includes(buscaPainel));
  };
  const dashboardRecords = useMemo(
    () => dayRecords.filter(recordMatchesDashboard),
    [buscaPainel, dashboardBranch, dashboardCompany, dashboardGroup, dashboardRole, dashboardSite, dashboardStatus, dayRecords, employeeById],
  );
  // O relatório usa os mesmos filtros do painel, só que em todos os dias: o
  // período é escolhido dentro dele.
  const relatorioRegistros = useMemo(
    () => (view === 'relatorios' ? safeRecords.filter(recordMatchesDashboard) : []),
    [buscaPainel, dashboardBranch, dashboardCompany, dashboardGroup, dashboardRole, dashboardSite, dashboardStatus, employeeById, safeRecords, view],
  );
  const filtrosDescritos = [
    dashboardCompany !== 'todas' && `Empresa: ${safeEmpresas.find(company => company.id === dashboardCompany)?.nome || dashboardCompany}`,
    dashboardGroup !== 'todos' && `Equipe: ${activeGroups.find(group => group.id === dashboardGroup)?.nome || dashboardGroup}`,
    dashboardRole !== 'todas' && `Função: ${dashboardRole}`,
    dashboardStatus !== 'todos' && `Situação: ${dashboardStatus}`,
    dashboardBranch !== 'todos' && `Ramo: ${dashboardBranch}`,
    dashboardSite !== 'todos' && `Canteiro: ${dashboardSite}`,
    dashboardSearch.trim() && `Busca: ${dashboardSearch.trim()}`,
  ].filter((item): item is string => Boolean(item));
  const pendingGroups = useMemo(
    () => activeGroups.filter(group => !dayRecords.some(record => teamRecordMatches(group, record))),
    [activeGroups, dayRecords],
  );
  const dashboardPendingGroups = useMemo(
    () => pendingGroups.filter(group => {
      const location = `${group.nome} ${group.frenteServico}`.toLocaleLowerCase('pt-BR');
      return (dashboardGroup === 'todos' || group.id === dashboardGroup)
        && (dashboardBranch === 'todos' || contemTermo(location, dashboardBranch))
        && (dashboardSite === 'todos' || contemTermo(location, dashboardSite));
    }),
    [dashboardBranch, dashboardGroup, dashboardSite, pendingGroups],
  );

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    safeRecords.forEach(record => counts.set(duplicateKey(record), (counts.get(duplicateKey(record)) || 0) + 1));
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [safeRecords]);

  const metrics = useMemo(() => {
    const plannedIds = new Set(activeGroups
      .filter(group => {
        const location = `${group.nome} ${group.frenteServico}`.toLocaleLowerCase('pt-BR');
        return (dashboardGroup === 'todos' || group.id === dashboardGroup)
          && (dashboardBranch === 'todos' || contemTermo(location, dashboardBranch))
          && (dashboardSite === 'todos' || contemTermo(location, dashboardSite));
      })
      .flatMap(group => group.funcionarioIds)
      .filter(id => {
        const employee = employeeById.get(id);
        return (dashboardCompany === 'todas' || employee?.empresaId === dashboardCompany)
          && (dashboardRole === 'todas' || employee?.cargo === dashboardRole);
      }));
    const planned = plannedIds.size;
    const present = dashboardRecords.filter(record => record.status === 'Presente').length;
    const absent = dashboardRecords.filter(record => record.status === 'Ausente').length;
    const justified = dashboardRecords.filter(record => ['Falta justificada', 'Atestado'].includes(record.status)).length;
    const latest = [...dashboardRecords].sort((a, b) => b.horaEnvio.localeCompare(a.horaEnvio))[0];
    return {
      planned,
      present,
      absent,
      justified,
      pending: dashboardPendingGroups.length,
      percent: planned ? Math.min(100, Math.round((present / planned) * 100)) : 0,
      latest: latest?.horaEnvio || '',
    };
  }, [activeGroups, dashboardBranch, dashboardCompany, dashboardGroup, dashboardPendingGroups.length, dashboardRecords, dashboardRole, dashboardSite, employeeById]);


  /** Distribuicao completa das situacoes do dia, nao so presente/ausente. */
  const distribuicao = useMemo(() => STATUS_OPTIONS
    .map(status => ({ status, total: dashboardRecords.filter(record => record.status === status).length }))
    .filter(item => item.total > 0), [dashboardRecords]);

  // Por frente: várias equipes trabalham no mesmo Ramo, e é pelo Ramo que se
  // decide remanejar gente no meio do dia.
  const efetivoDasFrentes = useMemo(
    () => efetivoPorFrente(dashboardRecords, activeGroups, safeFuncionarios),
    [dashboardRecords, activeGroups, safeFuncionarios],
  );

  // Por empresa: é assim que se cobra quem não entrega o efetivo contratado.
  const efetivoDasEmpresas = useMemo(
    () => efetivoPorEmpresa(dashboardRecords, safeFuncionarios, safeEmpresas),
    [dashboardRecords, safeFuncionarios, safeEmpresas],
  );

  // O painel mostra o dia; quem falta sempre só aparece no mês. A janela de 30
  // dias termina na data de referência, não em hoje, para conferir o passado.
  const [minimoFaltas, setMinimoFaltas] = useState(3);
  const reincidentes = useMemo(
    () => faltasRepetidas(safeRecords, {
      minimo: minimoFaltas,
      desde: diasAntes(referenceDate, 30),
      ate: referenceDate,
    }),
    [safeRecords, minimoFaltas, referenceDate],
  );

  const funcoesDoDia = useMemo(() => {
    const mapa = new Map<string, number>();
    dashboardRecords.forEach(record => mapa.set(record.funcao || 'Função não informada', (mapa.get(record.funcao || 'Função não informada') || 0) + 1));
    return [...mapa.entries()].map(([funcao, total]) => ({ funcao, total })).sort((a, b) => b.total - a.total);
  }, [dashboardRecords]);

  /** Quanta gente cada equipe confirmou no recorte, da maior para a menor. */
  const equipesDoDia = useMemo(() => {
    const mapa = new Map<string, { id: string; total: number }>();
    dashboardRecords.forEach(record => {
      const nome = record.grupoNome || 'Equipe não informada';
      const atual = mapa.get(nome) || { id: record.grupoId, total: 0 };
      mapa.set(nome, { id: atual.id || record.grupoId, total: atual.total + 1 });
    });
    return [...mapa.entries()].map(([nome, dados]) => ({ nome, ...dados })).sort((a, b) => b.total - a.total);
  }, [dashboardRecords]);

  /** Quem esta ausente hoje, para o administrativo agir sem trocar de aba. */
  const ausentesDoDia = useMemo(
    () => dashboardRecords.filter(record => record.status === 'Ausente' || record.status === 'Falta justificada'),
    [dashboardRecords],
  );

  useGSAP(() => {
    if (view !== 'ao-vivo' || !liveViewRef.current) return;
    const scope = liveViewRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    scope.querySelectorAll<HTMLElement>('[data-count]').forEach(node => {
      const target = Number(node.dataset.count || 0);
      if (reduceMotion) {
        node.textContent = target.toLocaleString('pt-BR');
        return;
      }
      const counter = { current: 0 };
      gsap.to(counter, {
        current: target,
        duration: 0.7,
        ease: 'power2.out',
        onUpdate: () => { node.textContent = Math.round(counter.current).toLocaleString('pt-BR'); },
      });
    });

    // A barra do efetivo confirmado enche da esquerda, junto com o número.
    const barraEfetivo = scope.querySelector<HTMLElement>('[data-barra-efetivo]');
    if (barraEfetivo && !reduceMotion) {
      gsap.fromTo(barraEfetivo, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.out', delay: 0.1 });
    }

    // Os cartões entram em cascata, de baixo para cima e de leve: dá ritmo à
    // leitura sem atrasar quem só quer ver o número.
    if (!reduceMotion) {
      gsap.fromTo(
        scope.querySelectorAll<HTMLElement>('[data-cartao-painel]'),
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07,
          clearProps: 'transform,opacity,visibility',
        },
      );
    }
  }, { scope: liveViewRef, dependencies: [view, metrics.present, distribuicao] });

  // Registros e histórico são listas longas de conferência. A mesma cascata
  // curta do painel ao vivo dá referência de ordem sem atrasar a leitura.
  useGSAP(() => {
    const scope = tabRef.current;
    if (!scope || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = scope.querySelectorAll('[data-linha-lista]');
    if (!rows.length) return;
    gsap.fromTo(
      rows,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.02, ease: 'power2.out', clearProps: 'transform,opacity,visibility' },
    );
  }, { scope: tabRef, dependencies: [view] });

  const teamRows = useMemo(() => activeGroups.map(group => {
    const records = dayRecords.filter(record => teamRecordMatches(group, record));
    return {
      group,
      sent: records.length > 0,
      present: records.filter(record => record.status === 'Presente').length,
      total: group.funcionarioIds.length,
      updatedAt: [...records].sort((a, b) => b.horaEnvio.localeCompare(a.horaEnvio))[0]?.horaEnvio || '',
    };
  }), [activeGroups, dayRecords]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLocaleLowerCase('pt-BR');
    return (verInativos ? inativos : safeRecords)
      .filter(record => !recordDate || record.data === recordDate)
      .filter(record => recordGroup === 'todos' || record.grupoId === recordGroup)
      .filter(record => recordStatus === 'todos' || record.status === recordStatus)
      .filter(record => !query || [record.funcionarioNome, record.funcao, record.responsavel, record.frenteServico]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(query)))
      .sort((a, b) => `${b.data} ${b.horaEnvio}`.localeCompare(`${a.data} ${a.horaEnvio}`));
  }, [inativos, recordDate, recordGroup, recordSearch, recordStatus, safeRecords, verInativos]);

  const exportRows = filteredRecords.map(record => [
    record.data,
    record.grupoNome,
    record.responsavel,
    record.frenteServico,
    record.funcionarioNome,
    record.funcao,
    record.status,
    record.observacao,
    record.horaEnvio,
  ]);


  const exportCsv = () => {
    const csv = toCsv([
      ['Data', 'Equipe', 'Responsável', 'Frente', 'Colaborador', 'Função', 'Status', 'Observação', 'Horário'],
      ...exportRows,
    ]);
    saveBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `presenca-${today}.csv`);
  };

  // Zerar o dia é a saída quando o apontamento sai errado: sem apagar a
  // reserva, a equipe fica travada e não consegue reenviar pelo link.
  const zerarDia = async () => {
    if (!onResetPresencaDia || recordGroup === 'todos' || resetBusy) return;
    const equipe = safeGroups.find(group => group.id === recordGroup);
    const quantos = safeRecords.filter(item => item.grupoId === recordGroup && item.data === recordDate).length;
    setResumoZerarDia({ equipe: equipe?.nome || recordGroup, quantos });
  };

  const confirmarZerarDia = async () => {
    if (!onResetPresencaDia || recordGroup === 'todos' || resetBusy) return;
    setResumoZerarDia(null);
    setResetBusy(true);
    try {
      const resposta = await onResetPresencaDia(recordGroup, recordDate);
      setFeedback(resposta.message);
    } finally {
      setResetBusy(false);
    }
  };

  const restoreHistory = async () => {
    if (!onRestorePresenceHistory || restoringHistory) return;
    setRestoringHistory(true);
    try {
      const resposta = await onRestorePresenceHistory();
      setFeedback(resposta.message);
    } finally {
      setRestoringHistory(false);
    }
  };

  const exportExcelRecords = async (records: PresencaApontamento[], reportDate: string, reportTitle: string) => {
    try {
      const workbook = await createCorporateWorkbook();
      configureCorporateWorkbook(workbook, reportTitle);
      const sheet = workbook.addWorksheet('Presença');
      sheet.columns = [
        { header: 'Data', key: 'data', width: 14 },
        { header: 'Equipe', key: 'equipe', width: 24 },
        { header: 'Responsável', key: 'responsavel', width: 26 },
        { header: 'Frente', key: 'frente', width: 28 },
        { header: 'Colaborador', key: 'colaborador', width: 34 },
        { header: 'Função', key: 'funcao', width: 28 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Observação', key: 'observacao', width: 36 },
        { header: 'Horário', key: 'horario', width: 12 },
      ];
      records.forEach(record => sheet.addRow([
        record.data, record.grupoNome, record.responsavel, record.frenteServico,
        record.funcionarioNome, record.funcao, record.status, record.observacao, record.horaEnvio,
      ]));
      styleCorporateWorksheet(sheet, { title: reportTitle, headerRow: 1, lastColumn: 9, recordCount: records.length });
      addCorporateSummarySheet(workbook, reportTitle, [
        ['Registros exportados', records.length],
        ['Presentes', records.filter(record => record.status === 'Presente').length],
        ['Ausentes', records.filter(record => record.status === 'Ausente').length],
        ['Data de referência', reportDate.split('-').reverse().join('/')],
      ]);
      await downloadCorporateWorkbook(workbook, `RENEA_situacao_diaria_${reportDate}.xlsx`);
    } catch (error) {
      console.error('Falha ao exportar Excel de presença:', error);
      setFeedback('Não foi possível gerar o Excel agora. Verifique a conexão e tente novamente.');
    }
  };

  const exportPdfRecords = async (records: PresencaApontamento[], reportDate: string, reportTitle: string, pendingCount: number) => {
    try {
      await generateUniversalPdfReport({
        title: reportTitle,
        subtitle: 'Efetivo recebido diretamente das equipes de campo',
        company: 'RENEA INFRAESTRUTURA · Sistema Integrado de Gestão Operacional',
        orientation: 'landscape',
        fileName: `RENEA_situacao_diaria_${reportDate}.pdf`,
        period: reportDate,
        filters: [recordGroup === 'todos' ? 'Todas as equipes' : `Equipe: ${recordGroup}`, recordStatus === 'todos' ? 'Todos os status' : `Status: ${recordStatus}`],
        summary: [
          { label: 'Registros', value: records.length },
          { label: 'Presentes', value: records.filter(record => record.status === 'Presente').length },
          { label: 'Ausentes', value: records.filter(record => record.status === 'Ausente').length },
          { label: 'Equipes pendentes', value: pendingCount },
        ],
        columns: [
          { header: 'Data', dataKey: 'data' },
          { header: 'Equipe', dataKey: 'equipe' },
          { header: 'Responsável', dataKey: 'responsavel' },
          { header: 'Frente', dataKey: 'frente' },
          { header: 'Colaborador', dataKey: 'colaborador' },
          { header: 'Função', dataKey: 'funcao' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Observação', dataKey: 'observacao' },
          { header: 'Horário', dataKey: 'horario' },
        ],
        rows: records.map(record => ({
          data: record.data,
          equipe: record.grupoNome,
          responsavel: record.responsavel,
          frente: record.frenteServico,
          colaborador: record.funcionarioNome,
          funcao: record.funcao,
          status: record.status,
          observacao: record.observacao,
          horario: record.horaEnvio,
        })),
      });
    } catch (error) {
      console.error('Falha ao exportar PDF de presença:', error);
      setFeedback('Não foi possível gerar o PDF agora. Verifique a conexão e tente novamente.');
    }
  };

  const exportExcel = () => exportExcelRecords(filteredRecords, recordDate || today, 'Relatório de presença');
  const exportPdf = () => exportPdfRecords(filteredRecords, recordDate || today, 'Relatório de presença', pendingGroups.length);
  const exportDailyExcel = () => exportExcelRecords(dayRecords, referenceDate, 'Relatório da situação do dia');
  const exportDailyPdf = () => exportPdfRecords(dayRecords, referenceDate, 'Relatório da situação do dia', pendingGroups.length);

  const openRecordEditor = (record: PresencaApontamento) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditObservation(record.observacao);
    setEditReason('');
  };

  const saveRecordEdit = () => {
    if (!editingRecord || !editReason.trim()) return;
    onUpdatePresencaLink(editingRecord.id, editStatus, editObservation, editReason.trim());
    setEditingRecord(null);
    setFeedback('Presença atualizada com histórico de auditoria.');
  };

  const deleteSelectedRecords = () => {
    if (selectedRecordIds.length === 0) return;
    setConfirmandoInativacao(true);
  };

  const confirmarInativacaoRegistros = () => {
    onInativarPresencaLink?.(selectedRecordIds);
    setFeedback(`${selectedRecordIds.length} registro(s) de presença inativado(s). Eles ficam em "Inativados" e podem voltar.`);
    setDesfazerInativacao(selectedRecordIds);
    setSelectedRecordIds([]);
    setConfirmandoInativacao(false);
  };

  const reativarRegistros = (ids: string[]) => {
    if (ids.length === 0) return;
    onReativarPresencaLink?.(ids);
    setFeedback(`${ids.length} registro(s) de presença reativado(s).`);
    setDesfazerInativacao([]);
    setSelectedRecordIds([]);
  };

  const alternarInativos = () => {
    setVerInativos(atual => !atual);
    setSelectedRecordIds([]);
  };

  // O dia, a lista do que foi lançado e o histórico. O resumo é relatório:
  // abre pela guia Relatórios (26/11/2026). O Link de presença fica em "Mais ações".
  const navItems: ReadonlyArray<ItemDasAbas<View>> = [
    { id: 'ao-vivo', rotulo: 'Ao vivo', icone: Radio },
    { id: 'registros', rotulo: 'Registros', icone: FileSpreadsheet },
    { id: 'historico', rotulo: 'Histórico', icone: History },
  ];

  // Registros e Histórico são tabelas: a área de dados fica do tamanho da tela
  // e só as linhas rolam. O resto (painel, relatório, cartões de equipe) é
  // aba longa, que rola por dentro.
  const telaDeTabela = view === 'registros' || view === 'historico';
  const nomeDoHistorico = (item: HistoricoPresenca) => safeText(employeeById.get(item.funcionarioId)?.nome) || item.funcionarioId;
  const todosFiltradosMarcados = filteredRecords.length > 0 && filteredRecords.every(record => selectedRecordIds.includes(record.id));
  const marcados = useMemo(() => new Set(selectedRecordIds), [selectedRecordIds]);

  const colunasRegistros: ColunaTabela<PresencaApontamento>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      larguraMinima: 150,
      valorOrdenacao: record => `${record.data} ${record.horaEnvio}`,
      dica: record => `${dataBr(record.data)} ${record.horaEnvio || ''}`.trim(),
      render: record => (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tabular-nums"><strong className="font-bold text-slate-900">{dataBr(record.data)}</strong> {record.horaEnvio || '--:--'}</span>
          {duplicateKeys.has(duplicateKey(record)) && <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800"><AlertTriangle className="h-3 w-3" aria-hidden="true" /> Duplicado</span>}
        </span>
      ),
    },
    {
      chave: 'colaborador',
      titulo: 'Colaborador',
      larguraMinima: 200,
      valorOrdenacao: record => record.funcionarioNome,
      dica: record => [record.funcionarioNome, record.funcao].filter(Boolean).join(' · '),
      render: record => (
        <>
          <span className="font-bold text-slate-900">{record.funcionarioNome || 'Colaborador não informado'}</span>
          <span className="text-[#5b6870]"> · {record.funcao || 'Função não informada'}</span>
        </>
      ),
    },
    {
      chave: 'equipe',
      titulo: 'Equipe',
      larguraMinima: 180,
      valorOrdenacao: record => record.grupoNome,
      dica: record => [record.grupoNome, record.responsavel, record.frenteServico].filter(Boolean).join(' · '),
      render: record => (
        <>
          <span className="font-semibold text-slate-900">{record.grupoNome || 'Equipe não informada'}</span>
          {(record.responsavel || record.frenteServico) && <span className="text-[#5b6870]"> · {[record.responsavel, record.frenteServico].filter(Boolean).join(' · ')}</span>}
        </>
      ),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      larguraMinima: 130,
      valorOrdenacao: record => record.status,
      dica: record => record.status,
      render: record => <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[record.status] || STATUS_STYLES.Outro}`}>{record.status}</span>,
    },
    {
      chave: 'observacao',
      titulo: 'Observação',
      larguraMinima: 160,
      render: record => record.observacao || '—',
      dica: record => record.observacao || undefined,
    },
  ];

  const colunasHistorico: ColunaTabela<HistoricoPresenca>[] = [
    { chave: 'data', titulo: 'Dia', larguraMinima: 100, valorOrdenacao: item => item.data, render: item => <span className="tabular-nums">{item.data.includes('-') ? dataBr(item.data) : item.data}</span> },
    { chave: 'colaborador', titulo: 'Colaborador', larguraMinima: 180, valorOrdenacao: item => nomeDoHistorico(item), render: item => <span className="font-bold text-slate-900">{nomeDoHistorico(item)}</span> },
    {
      chave: 'alteracao',
      titulo: 'Alteração',
      larguraMinima: 200,
      dica: item => `${item.valorAnterior} → ${item.valorNovo}`,
      render: item => (
        <span><span className="text-rose-700">{item.valorAnterior}</span> <ArrowRight className="mx-0.5 inline h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">para</span> <span className="font-bold text-emerald-800">{item.valorNovo}</span></span>
      ),
    },
    { chave: 'motivo', titulo: 'Motivo', larguraMinima: 180, render: item => item.motivo || '—', dica: item => item.motivo || undefined },
    { chave: 'editadoPor', titulo: 'Quem alterou', larguraMinima: 140, valorOrdenacao: item => item.editadoPor, render: item => <NomeComAvatar nome={item.editadoPor} /> },
    { chave: 'editadoEm', titulo: 'Quando', larguraMinima: 140, valorOrdenacao: item => item.editadoEm, render: item => <span className="tabular-nums">{quandoBr(item.editadoEm)}</span> },
  ];

  const aviso = feedback ? (
    <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
      <span className="min-w-0 flex-1">{feedback}</span>
      {desfazerInativacao.length > 0 && <button type="button" onClick={() => reativarRegistros(desfazerInativacao)} className={`${SECONDARY_BUTTON} shrink-0`} data-testid="presenca-desfazer"><Undo2 className="h-4 w-4" aria-hidden="true" />Desfazer</button>}
      <button type="button" onClick={() => { setFeedback(''); setDesfazerInativacao([]); }} aria-label="Fechar mensagem" className={`grid size-11 shrink-0 place-items-center rounded-lg hover:bg-emerald-100 lg:size-9 ${FOCO}`}><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  ) : null;

  // Padrão do site (seção 3): busca + um filtro (o dia) à vista; o resto no
  // botão Filtros, com o número de filtros ligados.
  const filtrosNoBotao = filtrosAtivos - (dashboardSearch.trim() !== '' ? 1 : 0);
  const faixaPainel = (
    <section className={PANEL} aria-label="Recorte do painel">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Buscar pessoa</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input type="search" value={dashboardSearch} onChange={event => setDashboardSearch(event.target.value)} placeholder="Buscar nome ou matrícula" className={`${FIELD} pl-9`} />
        </label>
        {view !== 'relatorios' && (
          <label className="max-sm:flex-1">
            <span className="sr-only">Dia</span>
            <input type="date" value={referenceDate} onChange={event => setReferenceDate(event.target.value)} max={today} className={FIELD} />
          </label>
        )}
        <button
          type="button"
          onClick={() => setFiltrosAbertos(atual => !atual)}
          aria-expanded={filtrosAbertos}
          aria-controls="presenca-filtros"
          className={`${filtrosAbertos ? PRIMARY_BUTTON : SECONDARY_BUTTON}`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros{filtrosNoBotao > 0 ? ` (${filtrosNoBotao})` : ''}
        </button>
        {filtrosAtivos > 0 && (
          <button
            type="button"
            onClick={limparFiltrosPainel}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-[#5b6870] hover:text-emerald-800 ${FOCO}`}
          >
            Limpar
          </button>
        )}
        <span className="ml-auto text-sm text-[#5b6870]">
          {view === 'relatorios' ? 'Os filtros valem para o relatório inteiro' : <><strong className="font-black text-slate-900">{dashboardRecords.length}</strong> pessoas no dia</>}
        </span>
      </div>

      {filtrosAbertos && (
        <div id="presenca-filtros" className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-3">
          <label><span className="sr-only">Empresa</span><select value={dashboardCompany} onChange={event => setDashboardCompany(event.target.value)} className={FIELD}><option value="todas">Todas as empresas</option>{safeEmpresas.map(company => <option key={company.id} value={company.id}>{company.nome}</option>)}</select></label>
          <label><span className="sr-only">Equipe</span><select value={dashboardGroup} onChange={event => setDashboardGroup(event.target.value)} className={FIELD}><option value="todos">Todas as equipes</option>{activeGroups.map(group => <option key={group.id} value={group.id}>{group.nome}</option>)}</select></label>
          <label><span className="sr-only">Função</span><select value={dashboardRole} onChange={event => setDashboardRole(event.target.value)} className={FIELD}><option value="todas">Todas as funções</option>{roleOptions.map(role => <option key={role}>{role}</option>)}</select></label>
          <label><span className="sr-only">Situação</span><select value={dashboardStatus} onChange={event => setDashboardStatus(event.target.value as 'todos' | PresencaStatus)} className={FIELD}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select></label>
          <label><span className="sr-only">Ramo</span><select value={dashboardBranch} onChange={event => setDashboardBranch(event.target.value)} className={FIELD}><option value="todos">Todos os ramos</option>{ACTIVE_BRANCHES.map(branch => <option key={branch}>{branch}</option>)}</select></label>
          <label><span className="sr-only">Canteiro</span><select value={dashboardSite} onChange={event => setDashboardSite(event.target.value)} className={FIELD}><option value="todos">Todos os canteiros</option>{canteiros.map(site => <option key={site}>{site}</option>)}</select></label>
        </div>
      )}
    </section>
  );

  const faixaRegistros = (
    <div className={`${PANEL} space-y-3 p-3`}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[170px_minmax(0,220px)_minmax(0,200px)_minmax(0,1fr)]">
        <label className="space-y-1">
          <span className={ROTULO_CAMPO}>Dia</span>
          <input type="date" value={recordDate} onChange={event => setRecordDate(event.target.value)} className={FIELD} aria-describedby="presenca-dia-dica" />
        </label>
        <label className="space-y-1">
          <span className={ROTULO_CAMPO}>Equipe</span>
          <select value={recordGroup} onChange={event => setRecordGroup(event.target.value)} className={FIELD}><option value="todos">Todas as equipes</option>{safeGroups.map(group => <option key={group.id} value={group.id}>{group.nome}</option>)}</select>
        </label>
        <label className="space-y-1">
          <span className={ROTULO_CAMPO}>Situação</span>
          <select value={recordStatus} onChange={event => setRecordStatus(event.target.value as 'todos' | PresencaStatus)} className={FIELD}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select>
        </label>
        <label className="relative space-y-1">
          <span className={ROTULO_CAMPO}>Buscar</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5b6870]" aria-hidden="true" />
            <input type="search" value={recordSearch} onChange={event => setRecordSearch(event.target.value)} placeholder="Colaborador, função ou responsável" className={`${FIELD} pl-10`} />
          </span>
        </label>
      </div>
      <p id="presenca-dia-dica" className="sr-only">Apague o dia para ver todos os dias.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSelectedRecordIds(todosFiltradosMarcados ? [] : filteredRecords.map(record => record.id))} disabled={filteredRecords.length === 0} className={SECONDARY_BUTTON} aria-pressed={todosFiltradosMarcados} data-testid="presenca-marcar-filtrados">
          <Check className="h-4 w-4" aria-hidden="true" />
          {todosFiltradosMarcados ? 'Desmarcar todos' : `Marcar os ${filteredRecords.length}`}
        </button>
        {selectedRecordIds.length > 0 && (verInativos
          ? <button type="button" onClick={() => reativarRegistros(selectedRecordIds)} className={PRIMARY_BUTTON} data-testid="presenca-reativar"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reativar ({selectedRecordIds.length})</button>
          : <button type="button" onClick={deleteSelectedRecords} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white transition hover:bg-rose-800 ${FOCO}`} data-testid="presenca-inativar"><Archive className="h-4 w-4" aria-hidden="true" /> Inativar ({selectedRecordIds.length})</button>)}
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {(verInativos || inativos.length > 0) && <button type="button" onClick={alternarInativos} aria-pressed={verInativos} className={SECONDARY_BUTTON} data-testid="presenca-ver-inativos">{verInativos ? <><ChevronLeft className="h-4 w-4" aria-hidden="true" />Voltar aos ativos</> : <><Archive className="h-4 w-4" aria-hidden="true" />Inativados ({inativos.length})</>}</button>}
          {onRestorePresenceHistory && <button type="button" onClick={() => void restoreHistory()} disabled={restoringHistory} className={`${SECONDARY_BUTTON} disabled:cursor-not-allowed disabled:opacity-60`} title="Busca de novo todos os envios já feitos pelo link público e traz de volta dias que sumiram, sem apagar nada"><RotateCcw className={`h-4 w-4 ${restoringHistory ? 'animate-spin' : ''}`} aria-hidden="true" />{restoringHistory ? 'Recuperando...' : 'Recuperar histórico'}</button>}
          {onResetPresencaDia && (
            <button
              type="button"
              onClick={() => void zerarDia()}
              disabled={recordGroup === 'todos' || resetBusy}
              title={recordGroup === 'todos' ? 'Escolha uma equipe para zerar o dia' : 'Apaga o apontamento do dia e libera novo envio pelo link'}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-800 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-45 ${FOCO}`}
            >
              <RotateCcw className={`h-4 w-4 ${resetBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
              Zerar o dia
            </button>
          )}
          <button type="button" onClick={() => void exportPdf()} className={SECONDARY_BUTTON}><FileText className="h-4 w-4" aria-hidden="true" /> PDF</button>
          <button type="button" onClick={exportCsv} className={SECONDARY_BUTTON}><Download className="h-4 w-4" aria-hidden="true" /> CSV</button>
        </div>
      </div>
      {verInativos && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900" data-testid="presenca-aviso-inativos">Mostrando os registros inativados. Marque os que devem voltar e toque em Reativar.</p>}
    </div>
  );

  const faixaDaVista = view === 'ao-vivo' || view === 'relatorios' ? faixaPainel
      : view === 'registros' ? faixaRegistros
        : null;

  const acaoPrincipal = <>
    {ehAdmin && <MaisAcoes testId="presenca-mais-acoes" acoes={[{ rotulo: 'Link de presença', icone: Link2, onClick: () => setView('link'), testId: 'presenca-abrir-link' }]} />}
    {view === 'registros' && <button type="button" onClick={() => void exportExcel()} className={PRIMARY_BUTTON} disabled={filteredRecords.length === 0}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Baixar Excel</button>}
  </>;

  return (
    <TelaCheia ref={tabRef} id="presenca-tab" rotulo="Presença" className="text-slate-900"
      longa={!telaDeTabela} idAbaAtiva={view === 'link' || relatorio ? undefined : idDaAba('presenca', view)} idDados="presenca-dados" chaveRolagem={view}
      cabecalho={<PageHeader
        eyebrow="Pessoas"
        title="Presença"
        abas={relatorio ? <VoltarAosRelatorios relatorio={relatorio} /> : <AbasDaTela<View> id="presenca" rotulo="Seções do controle de presença" abas={navItems} ativa={view} onTrocar={setView} idPainel="presenca-dados" testId="presenca-aba" />}
        actions={relatorio ? undefined : acaoPrincipal}
      />}
      faixa={aviso || faixaDaVista ? <>{aviso}{faixaDaVista && <div className={aviso ? 'mt-2' : undefined}>{faixaDaVista}</div>}</> : undefined}
    >
      {view === 'link' && ehAdmin && <LinkPresenca gruposEquipe={gruposEquipe} onSalvarLink={onSalvarLinkDaEquipe} />}

      {view === 'ao-vivo' && pendingPublicSubmissionsCount > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {pendingPublicSubmissionsCount === 1
              ? '1 envio do link público já chegou e está sendo processado agora.'
              : `${pendingPublicSubmissionsCount} envios do link público já chegaram e estão sendo processados agora.`}
            {' '}Se o número acima não crescer em alguns segundos, atualize a página.
          </span>
        </div>
      )}

      {/* Só a faixa de topo tem coluna lateral. Antes o grid de duas colunas
          envolvia a tela inteira: tudo que foi entrando ficou espremido em dois
          terços da largura e a direita virava um vazio de mil pixels. */}
      {view === 'ao-vivo' && (
        <div ref={liveViewRef} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
            {/* Os 4 cards de estatística entram aqui, embaixo do efetivo, em vez
                de numa faixa própria abaixo das duas colunas: "Atenção agora"
                é naturalmente mais alto (lista de equipes pendentes), e sem
                esse preenchimento sobrava uma faixa em branco do lado esquerdo. */}
            <div className="space-y-5">
              <article data-cartao-painel className="cv-hero-floresta relative overflow-hidden rounded-2xl p-4 sm:p-5">
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] font-medium text-emerald-200">Efetivo confirmado</p>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-emerald-100 ring-1 ring-inset ring-white/15"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{metrics.latest ? `Atualizado às ${metrics.latest}` : 'Aguardando o primeiro envio'}</span>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <strong data-count={metrics.present} className="text-4xl font-semibold tabular-nums tracking-[-0.04em] text-white sm:text-[2.75rem]">0</strong>
                    <div className="pb-1"><p className="text-sm font-semibold text-emerald-300">presentes</p><p className="text-xs text-emerald-200">{metrics.planned ? `de ${metrics.planned} previstos` : 'sem efetivo previsto vinculado às equipes'}</p></div>
                  </div>
                  {/* Sem efetivo previsto não existe percentual: mostrar "0% confirmado"
                      ao lado de 32 presentes faz o painel parecer quebrado. */}
                  {metrics.planned > 0 ? (
                    <>
                      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-white/15"><div data-barra-efetivo className="h-full origin-left rounded-full bg-emerald-400" style={{ width: `${metrics.percent}%` }} /></div>
                      <p className="mt-1.5 text-right text-xs font-semibold tabular-nums text-emerald-100">{metrics.percent}% confirmado</p>
                    </>
                  ) : (
                    <p className="mt-3.5 text-xs text-emerald-200">Vincule os colaboradores às equipes em <strong className="font-semibold text-white">Equipes</strong> para acompanhar o percentual confirmado.</p>
                  )}
                </div>
              </article>
              <div className="renea-faixa-numeros grid-cols-2">
                <CartaoIndicador dados={{ 'data-cartao-painel': true }} rotulo="Ausentes" valor={<span data-count={metrics.absent}>0</span>} detalhe="faltaram no dia" tom={metrics.absent > 0 ? 'vermelho' : 'neutro'} />
                <CartaoIndicador dados={{ 'data-cartao-painel': true }} rotulo="Justificados" valor={<span data-count={metrics.justified}>0</span>} detalhe="ausências com motivo" tom={metrics.justified > 0 ? 'laranja' : 'neutro'} />
                <CartaoIndicador dados={{ 'data-cartao-painel': true }} rotulo="Equipes pendentes" valor={<span data-count={metrics.pending}>0</span>} detalhe="ainda não enviaram" tom={metrics.pending > 0 ? 'laranja' : 'neutro'} />
                <CartaoIndicador dados={{ 'data-cartao-painel': true }} rotulo="Equipes ativas" valor={<span data-count={activeGroups.length}>0</span>} detalhe="equipes cadastradas" tom="verde" />
              </div>
            </div>
            <div className="space-y-5">
            <article data-cartao-painel className={`renea-card ${PANEL} p-5`}>
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><h2 className="text-lg font-black text-slate-900">Atenção agora</h2></div>
              <div className="mt-4 space-y-2">
                {pendingGroups.length === 0 && metrics.absent === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">Todas as equipes enviaram e não há ausências abertas.</p> : null}
                {/* A equipe que não usou o link precisa de saída aqui mesmo: é
                    neste cartão que alguém descobre que falta apontamento. */}
                {pendingGroups.slice(0, 5).map(group => (
                  <div key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <span className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full bg-[#f26a2e]" aria-hidden="true" /><span><strong className="text-slate-900">{group.nome}</strong> ainda não enviou a presença.</span></span>
                    {onLancarPresencaManual && (
                      <button
                        type="button"
                        onClick={() => abrirLancamento(group.id)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:border-[#176b4d] hover:text-[#176b4d]"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Lançar presença
                      </button>
                    )}
                  </div>
                ))}
                {metrics.absent > 0 && <button type="button" onClick={() => { setRecordStatus('Ausente'); setView('registros'); }} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-800 hover:border-[#176b4d]"><span><strong className="text-rose-700">{metrics.absent}</strong> ausência(s) aguardando conferência</span><ChevronRight className="h-4 w-4" /></button>}
              </div>
            </article>
            </div>
          </div>

            <div className="grid gap-3 md:grid-cols-3">
              <article data-cartao-painel className={`renea-card ${PANEL} p-5`}>
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-500">Efetivo por função</p><span className="text-xs font-black text-emerald-800">{referenceDate.split('-').reverse().join('/')}</span></div>
                {funcoesDoDia.length === 0 ? <p className="mt-6 text-sm text-slate-500">Nenhuma função registrada neste recorte.</p> : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {funcoesDoDia.slice(0, 7).map(item => <button type="button" key={item.funcao} onClick={() => setDashboardRole(item.funcao)} className="group block w-full py-2 text-left" aria-label={`Filtrar ${item.funcao}: ${item.total}`}>
                      <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700 group-hover:text-emerald-800">{item.funcao}</span><strong className="tabular-nums text-slate-900">{item.total}</strong></div>
                    </button>)}
                  </div>
                )}
              </article>

              <article data-cartao-painel className={`renea-card ${PANEL} p-5`}>
                <p className="text-xs font-bold text-slate-500">Situações registradas no dia</p>
                {distribuicao.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">Nenhum envio recebido para {referenceDate.split('-').reverse().join('/')}.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {distribuicao.map(item => (
                      <li key={item.status}><button type="button" onClick={() => setDashboardStatus(item.status)} className="group block w-full py-2 text-left">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-slate-700 group-hover:text-emerald-800">
                            {item.status}
                            {AFASTAMENTOS_PREVISTOS.includes(item.status) && (
                              <span className="rounded-full border border-stone-300 bg-stone-100 px-1.5 py-0.5 text-xs font-bold text-stone-600">
                                Afastamento previsto
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums text-slate-500">{item.total}</span>
                        </div>
                      </button></li>
                    ))}
                  </ul>
                )}
              </article>

              <article data-cartao-painel className={`renea-card ${PANEL} p-5`}>
                <p className="text-xs font-bold text-slate-500">Efetivo por equipe</p>
                {equipesDoDia.length === 0 ? <p className="mt-6 text-sm text-slate-500">Nenhuma equipe com envio neste recorte.</p> : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {equipesDoDia.slice(0, 7).map(item => (
                      <button type="button" key={item.nome} onClick={() => setDashboardGroup(item.id || 'todos')} className="group block w-full py-2 text-left" aria-label={`Filtrar ${item.nome}: ${item.total} pessoa(s)`}>
                        <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700 group-hover:text-emerald-800">{item.nome}</span><strong className="tabular-nums text-slate-900">{item.total}</strong></div>
                      </button>
                    ))}
                  </div>
                )}
              </article>

            </div>


            {ausentesDoDia.length > 0 && (
              <article data-cartao-painel className={`renea-card ${PANEL} overflow-hidden`}>
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-bold text-rose-700">Conferência</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Quem não está em campo hoje</h2>
                  </div>
                  <span className="text-sm font-black tabular-nums text-rose-700">{ausentesDoDia.length}</span>
                </header>
                <ul className="divide-y divide-slate-200">
                  {ausentesDoDia.slice(0, 8).map(record => (
                    <li key={record.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${STATUS_STYLES[record.status] || STATUS_STYLES.Outro}`}>{record.status}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{record.funcionarioNome}</p>
                        <p className="truncate text-xs text-slate-500">{record.grupoNome} · {record.observacao || 'Sem observação'}</p>
                      </div>
                      <button type="button" onClick={() => openRecordEditor(record)} className="shrink-0 text-xs font-bold text-emerald-800 hover:underline">Revisar</button>
                    </li>
                  ))}
                </ul>
                {ausentesDoDia.length > 8 && (
                  <button type="button" onClick={() => { setRecordStatus('Ausente'); setRecordDate(referenceDate); setView('registros'); }} className="w-full border-t border-slate-200 px-5 py-3 text-xs font-bold text-emerald-800 hover:bg-slate-50">
                    Ver todos os {ausentesDoDia.length} registros
                  </button>
                )}
              </article>
            )}

            <article data-cartao-painel className={`renea-card ${PANEL} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div><h2 className="text-xl font-black tracking-tight text-slate-900">Situação do dia</h2></div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={referenceDate} onChange={event => setReferenceDate(event.target.value)} max={today} className={`${FIELD} w-auto`} aria-label="Data do relatório diário" />
                  <button type="button" onClick={() => void exportDailyExcel()} className={PRIMARY_BUTTON} disabled={dayRecords.length === 0} title="Baixar situação do dia em Excel"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
                  <button type="button" onClick={() => void exportDailyPdf()} className={SECONDARY_BUTTON} disabled={dayRecords.length === 0} title="Imprimir situação do dia em PDF"><FileText className="h-4 w-4" /> PDF</button>
                  {onGerenciarEquipes && <button type="button" onClick={onGerenciarEquipes} className="inline-flex items-center gap-1 px-2 text-sm font-bold text-emerald-800 hover:text-emerald-950" data-testid="presenca-gerenciar-equipes">Gerenciar equipes <ChevronRight className="h-4 w-4" /></button>}
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {teamRows.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">Nenhuma equipe ativa cadastrada.</div>
                ) : teamRows.map(row => (
                  <div key={row.group.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${row.sent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {row.sent ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{row.group.nome}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row.group.responsavel} · {row.group.frenteServico}</p></div>
                    <div className="text-right"><p className="text-lg font-black tabular-nums text-slate-900">{row.present}/{row.total}</p><p className={`text-xs font-bold ${row.sent ? 'text-emerald-800' : 'text-amber-800'}`}>{row.sent ? row.updatedAt || 'Recebido' : 'Pendente'}</p></div>
                  </div>
                ))}
              </div>
            </article>

            {/* Painel interativo: cada linha é um filtro. Clicar numa frente ou
                numa empresa recorta o painel inteiro por ela; clicar de novo
                desfaz. O número deixa de ser só leitura e vira o caminho. */}
            <div className="grid gap-5 xl:grid-cols-2">
              <article data-cartao-painel className={`renea-card ${PANEL} overflow-hidden`}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs font-bold text-emerald-800">Frentes de serviço</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Onde falta gente</h2>
                  <p className="mt-1 text-xs text-slate-500">Da maior falta para a menor. Toque numa frente para recortar o painel por ela.</p>
                </div>
                <ul className="divide-y divide-slate-200">
                  {efetivoDasFrentes.length === 0 && (
                    <li className="px-5 py-10 text-center text-sm text-slate-500">Nenhum apontamento no recorte.</li>
                  )}
                  {efetivoDasFrentes.slice(0, 8).map(linha => {
                    const ativo = dashboardBranch === linha.chave;
                    const falta = Math.max(0, linha.previstos - linha.confirmados);
                    return (
                      <li key={linha.chave}>
                        <button
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => setDashboardBranch(ativo ? 'todos' : linha.chave)}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition ${ativo ? 'bg-emerald-50' : 'hover:bg-[#f7f8f6]'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{linha.rotulo}</p>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-[#176b4d]"
                                style={{ width: `${Math.min(100, linha.percentual ?? 0)}%` }}
                              />
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-black tabular-nums text-slate-900">
                              {linha.confirmados}{linha.previstos > 0 ? <span className="text-xs font-bold text-slate-500">/{linha.previstos}</span> : null}
                            </p>
                            <p className={`text-xs font-bold ${falta > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                              {falta > 0 ? `faltam ${falta}` : 'completa'}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>

              <article data-cartao-painel className={`renea-card ${PANEL} overflow-hidden`}>
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-xs font-bold text-emerald-800">Empresas</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Quem entregou efetivo</h2>
                  <p className="mt-1 text-xs text-slate-500">Toque numa empresa para ver só o efetivo dela.</p>
                </div>
                <ul className="divide-y divide-slate-200">
                  {efetivoDasEmpresas.length === 0 && (
                    <li className="px-5 py-10 text-center text-sm text-slate-500">Nenhum apontamento no recorte.</li>
                  )}
                  {efetivoDasEmpresas.map(linha => {
                    const ativo = dashboardCompany === linha.chave;
                    return (
                      <li key={linha.chave}>
                        <button
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => setDashboardCompany(ativo ? 'todas' : linha.chave)}
                          className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition ${ativo ? 'bg-emerald-50' : 'hover:bg-[#f7f8f6]'}`}
                        >
                          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{linha.rotulo}</p>
                          <div className="shrink-0 text-right">
                            <p className="text-base font-black tabular-nums text-slate-900">{linha.confirmados}</p>
                            {linha.ausentes > 0 && <p className="text-xs font-bold text-rose-700">{linha.ausentes} ausente(s)</p>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </div>

            <article data-cartao-painel className={`renea-card ${PANEL} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-bold text-emerald-800">Últimos 30 dias</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Quem falta sempre</h2>
                  <p className="mt-1 text-xs text-slate-500">O painel mostra o dia; o problema aparece no mês. Toque no nome para ver os registros da pessoa.</p>
                </div>
                <label className="text-xs font-bold text-slate-500">
                  <span className="sr-only">Mínimo de faltas</span>
                  <select
                    value={minimoFaltas}
                    onChange={event => setMinimoFaltas(Number(event.target.value))}
                    className={`${FIELD} w-auto`}
                  >
                    {[2, 3, 5, 8].map(quantidade => (
                      <option key={quantidade} value={quantidade}>{quantidade}+ faltas</option>
                    ))}
                  </select>
                </label>
              </div>
              <ul className="divide-y divide-slate-200">
                {reincidentes.length === 0 && (
                  <li className="px-5 py-10 text-center text-sm text-slate-500">
                    Ninguém com {minimoFaltas} faltas ou mais nos últimos 30 dias.
                  </li>
                )}
                {reincidentes.slice(0, 10).map(pessoa => (
                  <li key={pessoa.funcionarioId}>
                    <button
                      type="button"
                      onClick={() => { setDashboardSearch(pessoa.nome); setRecordSearch(pessoa.nome); setView('registros'); }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-[#f7f8f6]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{pessoa.nome}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{pessoa.funcao} · {pessoa.equipe}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {pessoa.datas.slice(0, 6).map(data => data.slice(8, 10) + '/' + data.slice(5, 7)).join(' · ')}
                          {pessoa.datas.length > 6 ? ` · +${pessoa.datas.length - 6}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black tabular-nums text-rose-700">{pessoa.faltas}</p>
                        <p className="text-xs font-bold text-slate-500">faltas</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
        </div>
      )}

      {view === 'relatorios' && (
        <RelatoriosPresenca
          registros={relatorioRegistros}
          funcionarios={safeFuncionarios}
          empresas={safeEmpresas}
          filtrosDescritos={filtrosDescritos}
          onVerPessoa={nome => { setRecordSearch(nome); setRecordDate(''); setRecordStatus('todos'); setRecordGroup('todos'); setView('registros'); }}
        />
      )}

      {view === 'registros' && (
        <TabelaPadrao
          titulo={verInativos ? 'Registros de presença inativados' : 'Registros de presença'}
          linhas={filteredRecords}
          colunas={colunasRegistros}
          idDaLinha={record => record.id || `${duplicateKey(record)}-${record.horaEnvio}`}
          nomeDoItem={{ um: 'registro', varios: 'registros' }}
          vazio="Nenhum registro encontrado para os filtros escolhidos."
          selecao={{
            marcados,
            onAlternar: id => setSelectedRecordIds(atual => (atual.includes(id) ? atual.filter(item => item !== id) : [...atual, id])),
            onAlternarVarios: (ids, marcar) => setSelectedRecordIds(atual => (marcar ? [...new Set([...atual, ...ids])] : atual.filter(id => !ids.includes(id)))),
            rotulo: record => `Marcar presença de ${record.funcionarioNome || 'colaborador'} em ${dataBr(record.data)}`,
          }}
          tituloAcoes="Corrigir"
          acoes={record => (
            <button type="button" onClick={() => openRecordEditor(record)} className={`${SECONDARY_BUTTON} min-h-11 px-3 md:min-h-8`} aria-label={`Corrigir presença de ${record.funcionarioNome || 'colaborador'}`}>
              <Edit3 className="h-4 w-4" aria-hidden="true" /> Corrigir
            </button>
          )}
          className="flex-1"
          testId="presenca-registros"
        />
      )}

      {view === 'historico' && (
        <TabelaPadrao
          titulo="Correções feitas nos registros de presença"
          linhas={safeHistory}
          colunas={colunasHistorico}
          idDaLinha={item => item.id}
          nomeDoItem={{ um: 'correção', varios: 'correções' }}
          ordenacaoInicial={{ chave: 'editadoEm', direcao: 'desc' }}
          vazio="Nenhuma correção de presença registrada. Toda correção feita em Registros aparece aqui, com o motivo e quem fez."
          className="flex-1"
          testId="presenca-historico"
        />
      )}
      {editingRecord && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Atualizar presença">
          <div className="w-full max-w-lg rounded-t-[1.75rem] bg-white p-5  sm:rounded-[1.75rem] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Atualizar presença</h2><p className="mt-1 text-sm text-slate-500">{editingRecord.funcionarioNome} · {editingRecord.grupoNome}</p></div><button type="button" onClick={() => setEditingRecord(null)} className="rounded-xl border border-slate-200 p-2.5 text-slate-500"><X className="h-5 w-5" /></button></div>
            <div className="mt-6 space-y-4"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span><select value={editStatus} onChange={event => setEditStatus(event.target.value as PresencaStatus)} className={FIELD}>{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Observação</span><textarea value={editObservation} onChange={event => setEditObservation(event.target.value)} rows={3} className={`${FIELD} py-3`} /></label><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Motivo obrigatório</span><textarea value={editReason} onChange={event => setEditReason(event.target.value)} rows={3} className={`${FIELD} py-3`} /></label></div>
            <div className="mt-6 flex gap-3"><button type="button" onClick={() => setEditingRecord(null)} className={`${SECONDARY_BUTTON} flex-1`}>Cancelar</button><button type="button" onClick={saveRecordEdit} disabled={!editReason.trim()} className={`${PRIMARY_BUTTON} flex-1`}><CheckCircle2 className="h-4 w-4" /> Salvar</button></div>
          </div>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={confirmandoInativacao}
        tone="warning"
        title={`Inativar ${selectedRecordIds.length} registro(s) de presença?`}
        description="Os apontamentos saem das telas e dos relatórios, mas continuam guardados. Para trazer de volta, abra Inativados e toque em Reativar."
        confirmLabel="Inativar"
        onConfirm={confirmarInativacaoRegistros}
        onCancel={() => setConfirmandoInativacao(false)}
      />
      <ConfirmDialog
        open={Boolean(resumoZerarDia)}
        tone="danger"
        busy={resetBusy}
        title={`Zerar o dia ${recordDate}?`}
        description={`Equipe ${resumoZerarDia?.equipe || ''}: ${resumoZerarDia?.quantos || 0} registro(s) serão apagados e a equipe poderá enviar a presença de novo pelo link. Esta ação não pode ser desfeita.`}
        confirmLabel="Zerar o dia"
        onConfirm={confirmarZerarDia}
        onCancel={() => setResumoZerarDia(null)}
      />

      {lancamento && onLancarPresencaManual && (() => {
        const grupo = safeGroups.find(item => item.id === lancamento.grupoId);
        const pessoas = (grupo?.funcionarioIds || [])
          .map(id => employeeById.get(id))
          .filter((pessoa): pessoa is Funcionario => Boolean(pessoa));
        const conferidos = pessoas.filter(pessoa => situacoesLancadas[pessoa.id]?.status).length;
        const lancar = () => {
          if (!grupo || conferidos === 0) return;
          onLancarPresencaManual(
            grupo,
            lancamento.data,
            Object.values(situacoesLancadas).filter(item => item.status),
            lancamento.observacaoDia,
          );
          setFeedback(`Presença de ${grupo.nome} lançada pelo painel.`);
          setLancamento(null);
        };

        return (
          <Modal
            open
            size="lg"
            lancamento
            title={grupo ? `Lançar presença · ${grupo.nome}` : 'Lançar presença'}
            description="Escolha a equipe e o dia, e toque na situação de cada pessoa."
            onClose={() => setLancamento(null)}
            onSubmit={lancar}
            footer={(
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="mr-auto text-xs font-bold text-slate-500">
                  {conferidos} de {pessoas.length} conferido(s)
                </span>
                <button
                  type="button"
                  onClick={() => setLancamento(null)}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={!grupo || conferidos === 0}
                  onClick={lancar}
                  className="min-h-11 rounded-lg bg-[#176b4d] px-5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  data-testid="presenca-lancar-salvar"
                >
                  Lançar presença
                </button>
              </div>
            )}
          >
            <div className="max-w-4xl space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">Equipe</span>
                  <select
                    value={lancamento.grupoId}
                    onChange={event => abrirLancamento(event.target.value, lancamento.data)}
                    className={FIELD}
                  >
                    <option value="">Escolha a equipe</option>
                    {safeGroups.filter(item => item.status !== 'inativo').map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">Dia</span>
                  <input
                    type="date"
                    max={today}
                    value={lancamento.data}
                    onChange={event => setLancamento(atual => atual && { ...atual, data: event.target.value })}
                    className={FIELD}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">Observação do dia</span>
                  <input
                    value={lancamento.observacaoDia}
                    onChange={event => setLancamento(atual => atual && { ...atual, observacaoDia: event.target.value })}
                    placeholder="Chuva, parada de frente…"
                    className={FIELD}
                  />
                </label>
              </div>

              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                O lançamento fica marcado como feito pelo painel, com o seu nome. Relançar o mesmo dia
                corrige as situações escolhidas e não duplica ninguém.
              </p>

              {!grupo && <p className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">Escolha a equipe para ver as pessoas.</p>}
              {grupo && pessoas.length === 0 && <p className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">Esta equipe ainda não tem pessoas. Monte a equipe na subaba Equipes.</p>}
              <ul className="space-y-2">
                {pessoas.map(pessoa => {
                  const atual = situacoesLancadas[pessoa.id]?.status;
                  return (
                    <li key={pessoa.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="text-sm font-bold text-slate-900">{pessoa.nome}</strong>
                        <span className="text-xs text-slate-500">{pessoa.cargo}{pessoa.matricula ? ` · Mat. ${pessoa.matricula}` : ''}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map(status => (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={atual === status}
                            onClick={() => setSituacoesLancadas(atuais => ({
                              ...atuais,
                              [pessoa.id]: { funcionarioId: pessoa.id, status, observacao: atuais[pessoa.id]?.observacao },
                            }))}
                            className={`min-h-10 rounded-lg border px-3 text-xs font-bold transition ${
                              atual === status
                                ? 'border-emerald-700 bg-[#176b4d] text-white'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-700'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Modal>
        );
      })()}

      {/* Task 8: EscalaSabado Modal */}
      {mostrarEscalaSabado && (
        <Modal
          open
          size="lg"
          title="Escala para sábado"
          onClose={() => setMostrarEscalaSabado(false)}
        >
          <EscalaSabado
            funcionarios={funcionarios}
            gruposEquipe={gruposEquipe}
            onSalvar={async (escala) => {
              if (!escala.grupoEquipeId) {
                setFeedback('Selecione uma equipe antes de salvar a escala de sábado.');
                return;
              }
              const grupo = gruposEquipe.find(item => item.id === escala.grupoEquipeId);
              const chaveLocal = `renea_escala_sabado_${escala.grupoEquipeId}_${escala.data}`;
              try {
                localStorage.setItem(chaveLocal, JSON.stringify(escala));
              } catch {
                // Cópia local é best-effort; a gravação principal segue abaixo.
              }
              if (!grupo?.token) {
                setFeedback('Escala salva localmente neste aparelho. Ative o link da equipe para sincronizar com o campo.');
                setMostrarEscalaSabado(false);
                return;
              }
              try {
                const resposta = await saveSaturdayScale(grupo.token, grupo.id, {
                  funcionarios: escala.funcionarios,
                  observacaoGeral: escala.observacaoGeral,
                }, escala.data);
                setFeedback(resposta.message || `Escala de sábado de ${grupo.nome} salva.`);
                setMostrarEscalaSabado(false);
              } catch (error) {
                const detalhe = error instanceof Error ? error.message : 'Falha de conexão.';
                setFeedback(`Não foi possível enviar a escala ao servidor (${detalhe}). Uma cópia ficou guardada neste aparelho.`);
              }
            }}
            onCancelar={() => setMostrarEscalaSabado(false)}
          />
        </Modal>
      )}
    </TelaCheia>
  );
}

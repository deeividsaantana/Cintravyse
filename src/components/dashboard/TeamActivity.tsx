import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { DashboardGeneralViewModel } from '../../utils/dashboardGeneral';
import './TeamActivity.css';

gsap.registerPlugin(useGSAP);

const PRIMEIRAS_EQUIPES = 8;
const formatDate = (value: string | null) => value ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : '—';
const iniciais = (nome: string) =>
  nome
    .replace(/^DIVERSOS\s*-\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase() || 'EQ';

type FiltroEquipe = 'todas' | 'enviadas' | 'pendentes';

export function TeamActivity({ view, onNavigate }: { view: DashboardGeneralViewModel; onNavigate: (target: string) => void }) {
  const scope = useRef<HTMLDivElement>(null);
  const [todasEquipes, setTodasEquipes] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroEquipe>('todas');

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return view.teams.items.filter(team => {
      if (filtro === 'enviadas' && !team.reported) return false;
      if (filtro === 'pendentes' && team.reported) return false;
      if (!termo) return true;
      return `${team.name} ${team.front}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [busca, filtro, view.teams.items]);

  // Mantém o contrato direto de "Mostrar mais equipes" sobre a coleção completa
  const listaBase = busca || filtro !== 'todas' ? filtradas : (todasEquipes ? view.teams.items : view.teams.items.slice(0, PRIMEIRAS_EQUIPES));
  const equipesVisiveis = (busca || filtro !== 'todas') && !todasEquipes ? listaBase.slice(0, PRIMEIRAS_EQUIPES) : listaBase;
  const totalAtual = busca || filtro !== 'todas' ? filtradas.length : view.teams.items.length;
  const equipesEscondidas = totalAtual - PRIMEIRAS_EQUIPES;
  const lastDate = view.teams.items.map(team => team.lastDate).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;

  useGSAP(() => {
    if (!scope.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(scope.current.querySelectorAll('[data-team-row]'), { opacity: 0.6, y: 6 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' });
  }, { scope, dependencies: [view.teams] });

  useGSAP(() => {
    if (!todasEquipes || !scope.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const novas = [...scope.current.querySelectorAll('[data-team-row]')].filter(row => row.hasAttribute('data-team-extra'));
    gsap.fromTo(novas, { opacity: 0.5, y: 6 }, { opacity: 1, y: 0, duration: 0.22, stagger: 0.02, ease: 'power2.out', clearProps: 'transform,opacity' });
  }, { scope, dependencies: [todasEquipes] });

  const enviadasCount = view.teams.withRecords;
  const pendentesCount = view.teams.total - view.teams.withRecords;

  return (
    <div ref={scope} className="dashboard-detail-grid">
      <section className="cv-bloco dashboard-detail-panel" aria-labelledby="dashboard-teams-title">
        <header className="cv-bloco__topo flex-wrap">
          <div className="min-w-0">
            <h2 id="dashboard-teams-title">Equipes hoje</h2>
            <small className="cv-bloco__resumo">
              {enviadasCount} de {view.teams.total} enviaram · último envio {formatDate(lastDate)}
            </small>
          </div>
          <button type="button" className="cv-bloco__abrir" onClick={() => onNavigate('presenca')}>
            Abrir presença <ChevronRight aria-hidden="true" />
          </button>
        </header>

        {/* Barra de busca + filtros rápidos embutidos na tabela */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label className="relative flex min-w-[12rem] flex-1 items-center rounded-lg bg-[#f4f7f5] px-2.5 ring-1 ring-[#d5ddd8] focus-within:bg-white focus-within:ring-[#176b4d]">
            <Search className="size-3.5 shrink-0 text-[#54645c]" aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Filtrar equipe ou frente…"
              aria-label="Filtrar equipes hoje"
              className="h-8 w-full bg-transparent px-2 text-[12px] text-[#10211c] outline-none placeholder:text-[#64748b]"
            />
          </label>
          <div className="inline-flex rounded-lg bg-[#eef2ef] p-0.5 text-xs" role="group" aria-label="Filtrar situação das equipes">
            {(
              [
                ['todas', `Todas (${view.teams.total})`],
                ['enviadas', `Enviadas (${enviadasCount})`],
                ['pendentes', `Pendentes (${pendentesCount})`],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filtro === id}
                onClick={() => setFiltro(id)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filtro === id ? 'bg-white text-[#176b4d] shadow-[0_1px_2px_rgba(11,27,22,0.08)]' : 'text-[#54645c] hover:text-[#10211c]'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {equipesVisiveis.length ? (
          <div className="dashboard-team-list">
            <div className="dashboard-team__head" aria-hidden="true">
              <span>Equipe</span>
              <span>Frente de serviço</span>
              <span>Envio</span>
              <span className="text-right">Situação</span>
            </div>
            {equipesVisiveis.map((team, index) => (
              <button
                key={team.id}
                type="button"
                className="dashboard-team"
                onClick={() => onNavigate('presenca')}
                data-team-row
                data-team-extra={index >= PRIMEIRAS_EQUIPES || undefined}
              >
                <span className="dashboard-team__name">
                  <i aria-hidden="true">{iniciais(team.name)}</i>
                  <strong>{team.name}</strong>
                </span>
                <span className="dashboard-team__front">{team.front}</span>
                <span className="dashboard-team__date">{formatDate(team.lastDate)}</span>
                <b data-vazio={!team.reported || undefined}>{team.reported ? `${team.present} presentes` : 'Pendente'}</b>
              </button>
            ))}
          </div>
        ) : (
          <div className="dashboard-detail-panel__empty">
            {view.teams.items.length ? 'Nenhuma equipe corresponde ao filtro.' : 'Nenhuma equipe ativa cadastrada nesta obra.'}
          </div>
        )}

        {equipesEscondidas > 0 && (
          <button
            type="button"
            className="dashboard-detail-panel__all"
            aria-expanded={todasEquipes}
            onClick={() => setTodasEquipes(aberto => !aberto)}
          >
            {todasEquipes ? 'Mostrar menos equipes' : `Mostrar mais equipes (+${equipesEscondidas})`}
            <ChevronDown size={15} className={todasEquipes ? 'dashboard-detail-panel__all-icon is-open' : 'dashboard-detail-panel__all-icon'} aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  );
}

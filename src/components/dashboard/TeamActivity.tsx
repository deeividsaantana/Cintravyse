import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DashboardGeneralViewModel } from '../../utils/dashboardGeneral';
import './TeamActivity.css';

gsap.registerPlugin(useGSAP);

const PRIMEIRAS_EQUIPES = 5;
const formatDate = (value: string | null) => value ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : '—';

export function TeamActivity({ view, onNavigate }: { view: DashboardGeneralViewModel; onNavigate: (target: string) => void }) {
  const scope = useRef<HTMLDivElement>(null);
  const [todasEquipes, setTodasEquipes] = useState(false);
  const equipesVisiveis = todasEquipes ? view.teams.items : view.teams.items.slice(0, PRIMEIRAS_EQUIPES);
  const equipesEscondidas = view.teams.items.length - PRIMEIRAS_EQUIPES;
  const lastDate = view.teams.items.map(team => team.lastDate).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;

  useGSAP(() => {
    if (!scope.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(scope.current.querySelectorAll('[data-team-row]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .55, stagger: .055, ease: 'power2.out', clearProps: 'transform' });
    gsap.fromTo(scope.current.querySelectorAll('.dashboard-team__bar-fill'), { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: .9, stagger: .06, ease: 'power3.out' });
  }, { scope, dependencies: [view.teams] });

  // Ao abrir a lista inteira, só as equipes que acabaram de aparecer entram animadas.
  useGSAP(() => {
    if (!todasEquipes || !scope.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const novas = [...scope.current.querySelectorAll('[data-team-row]')].filter(row => row.hasAttribute('data-team-extra'));
    gsap.fromTo(novas, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .45, stagger: .035, ease: 'power2.out', clearProps: 'transform' });
  }, { scope, dependencies: [todasEquipes] });

  return <div ref={scope} className="dashboard-detail-grid">
    <section className="cv-bloco dashboard-detail-panel" aria-labelledby="dashboard-teams-title">
      <header className="cv-bloco__topo"><h2 id="dashboard-teams-title">Equipes hoje</h2><small className="cv-bloco__resumo">{view.teams.withRecords} de {view.teams.total} enviaram · último envio {formatDate(lastDate)}</small><button type="button" className="cv-bloco__abrir" onClick={() => onNavigate('presenca')}>Abrir <ChevronRight aria-hidden="true" /></button></header>
      {view.teams.items.length ? <div className="dashboard-team-list">{equipesVisiveis.map((team, index) => <button key={team.id} type="button" className="dashboard-team" onClick={() => onNavigate('presenca')} data-team-row data-team-extra={index >= PRIMEIRAS_EQUIPES || undefined}>
        <strong>{team.name}</strong>
        <span>{team.front}</span>
        <span>{formatDate(team.lastDate)}</span>
        <b data-vazio={!team.reported || undefined}>{team.reported ? `${team.present} presentes` : 'sem registro'}</b>
      </button>)}</div> : <div className="dashboard-detail-panel__empty">Nenhuma equipe ativa cadastrada nesta obra.</div>}
      {equipesEscondidas > 0 && <button type="button" className="dashboard-detail-panel__all" aria-expanded={todasEquipes} onClick={() => setTodasEquipes(aberto => !aberto)}>
        {todasEquipes ? 'Mostrar menos equipes' : `Mostrar mais equipes (+${equipesEscondidas})`}
        <ChevronDown size={16} className={todasEquipes ? 'dashboard-detail-panel__all-icon is-open' : 'dashboard-detail-panel__all-icon'} aria-hidden="true" />
      </button>}
    </section>

  </div>;
}

import { ChevronRight } from 'lucide-react';
import './OperationalVisuals.css';

interface FleetCounts {
  operating: number;
  available: number;
  maintenance: number;
  pending: number;
  unknown: number;
  total: number;
  coverage: number | null;
}

export function FleetDonut({ fleet, onNavigate }: { fleet: FleetCounts; onNavigate: () => void }) {
  const entries = [
    { label: 'Em operação', value: fleet.operating, color: '#0c6b4e' },
    { label: 'Disponível', value: fleet.available, color: '#65bd91' },
    { label: 'Em manutenção', value: fleet.maintenance, color: '#dc7d45' },
    { label: 'Sem posição', value: fleet.pending + fleet.unknown, color: '#d5ded8' },
  ];
  let offset = 0;
  return <section className="cv-bloco dashboard-visual--fleet" aria-labelledby="dashboard-fleet-title">
    <header className="cv-bloco__topo"><h2 id="dashboard-fleet-title">Situação da frota</h2><button type="button" onClick={onNavigate} className="cv-bloco__abrir">Abrir <ChevronRight aria-hidden="true" /></button></header>
    {fleet.total ? <div className="dashboard-donut-layout">
      <div className="dashboard-donut" role="img" aria-label={`Frota: ${entries.map(entry => `${entry.value} ${entry.label.toLowerCase()}`).join(', ')}`}>
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="dashboard-donut__track" cx="100" cy="100" r="76" pathLength="100" />
          {entries.filter(entry => entry.value > 0).map(entry => {
            const share = entry.value / fleet.total * 100;
            const start = offset;
            offset += share;
            return <circle key={entry.label} className="dashboard-donut__segment" cx="100" cy="100" r="76" pathLength="100" stroke={entry.color} strokeDasharray={`${Math.max(0, share - .7)} ${100 - Math.max(0, share - .7)}`} strokeDashoffset={-start}><title>{entry.label}: {entry.value}</title></circle>;
          })}
        </svg>
        <div className="dashboard-donut__center"><strong>{fleet.total}</strong><span>equipamentos</span></div>
      </div>
      <div className="dashboard-donut-legend">{entries.map(entry => <button key={entry.label} type="button" onClick={onNavigate} className="dashboard-donut-legend__item"><span className="dashboard-donut-legend__dot" style={{ backgroundColor: entry.color }} /><span>{entry.label}</span><strong>{entry.value}</strong></button>)}</div>
    </div> : <div className="dashboard-visual__empty">Nenhum equipamento cadastrado neste recorte.</div>}
    <p className="dashboard-visual__foot">{fleet.coverage === null ? 'Sem posição diária confirmada' : `${fleet.coverage.toFixed(0)}% da frota com posição diária confirmada`}</p>
  </section>;
}

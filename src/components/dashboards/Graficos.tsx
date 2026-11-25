import { useEffect, useId, useRef, useState } from 'react';

/**
 * Gráficos leves da aba Dashboards (padrão Cintravyse, 25/11/2026), em SVG
 * puro, sem biblioteca: pizza, linha e barras. Todos mostram o valor ao
 * passar o mouse ou tocar, e cada série tem legenda com o número escrito (a
 * cor nunca é a única pista). Paleta validada para daltonismo (skill
 * dataviz): verde, azul, laranja, violeta, amarelo e rosa, nesta ordem.
 */
export const CORES_SERIE = ['#1f9d6a', '#257de0', '#f47230', '#6a4ce2', '#f2a600', '#ee7fac'] as const;
const COR_OUTROS = '#9aa3ad';

export interface Fatia { rotulo: string; valor: number }
export interface Ponto { rotulo: string; valor: number }

const fmt = (valor: number, casas = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(valor);

/** Até 5 fatias com nome; o resto vira "Outros" (nunca uma cor inventada). */
function juntarOutros(fatias: Fatia[]): Array<Fatia & { cor: string }> {
  const ordenadas = fatias.filter(f => f.valor > 0).sort((a, b) => b.valor - a.valor);
  const principais = ordenadas.slice(0, 5).map((f, i) => ({ ...f, cor: CORES_SERIE[i] }));
  const resto = ordenadas.slice(5).reduce((soma, f) => soma + f.valor, 0);
  return resto > 0 ? [...principais, { rotulo: 'Outros', valor: resto, cor: COR_OUTROS }] : principais;
}

export function GraficoPizza({ fatias, unidade = '', vazio }: { fatias: Fatia[]; unidade?: string; vazio: string }) {
  const [foco, setFoco] = useState<number | null>(null);
  const partes = juntarOutros(fatias);
  const total = partes.reduce((soma, f) => soma + f.valor, 0);
  if (total === 0) return <p className="cv-grafico__vazio">{vazio}</p>;
  const raio = 52;
  const volta = 2 * Math.PI * raio;
  let acumulado = 0;
  const ativo = foco === null ? null : partes[foco];
  return (
    <div className="cv-pizza">
      <svg viewBox="0 0 140 140" role="img" aria-label={partes.map(f => `${f.rotulo}: ${fmt(f.valor)}${unidade}`).join(', ')}>
        <circle cx="70" cy="70" r={raio} fill="none" stroke="#eef0f2" strokeWidth="18" />
        {partes.map((f, i) => {
          const tamanho = (f.valor / total) * volta;
          const inicio = acumulado;
          acumulado += tamanho;
          return (
            <circle key={f.rotulo} cx="70" cy="70" r={raio} fill="none" stroke={f.cor}
              strokeWidth={foco === i ? 22 : 18}
              strokeDasharray={`${Math.max(tamanho - 2, 0.5)} ${volta}`} strokeDashoffset={-inicio}
              transform="rotate(-90 70 70)" className="cv-pizza__fatia"
              onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)} />
          );
        })}
        <text x="70" y="68" textAnchor="middle" className="cv-pizza__total">{fmt(ativo ? ativo.valor : total)}</text>
        <text x="70" y="86" textAnchor="middle" className="cv-pizza__rotulo">{ativo ? ativo.rotulo : `total${unidade}`}</text>
      </svg>
      <ul className="cv-legenda">
        {partes.map((f, i) => (
          <li key={f.rotulo} data-foco={foco === i || undefined}>
            <button type="button" onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)} onFocus={() => setFoco(i)} onBlur={() => setFoco(null)}>
              <i style={{ background: f.cor }} aria-hidden="true" />
              <span>{f.rotulo}</span>
              <b>{fmt(f.valor)}{unidade}</b>
              <small>{fmt((f.valor / total) * 100)}%</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha (com área clara embaixo) ou barras, no mesmo eixo de tempo. */
export function GraficoTempo({ pontos, tipo, unidade = '', casas = 0, vazio, cor = CORES_SERIE[0] }: {
  pontos: Ponto[]; tipo: 'linha' | 'barras'; unidade?: string; casas?: number; vazio: string; cor?: string;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const idGradiente = useId();
  // O desenho usa a largura real da caixa: a letra do eixo fica com 12 px
  // em qualquer tela, sem encolher no celular nem crescer no monitor.
  const caixa = useRef<HTMLDivElement>(null);
  const [L, setL] = useState(560);
  const semDados = pontos.length === 0 || pontos.every(p => p.valor === 0);
  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const obs = new ResizeObserver(([entrada]) => setL(Math.max(240, Math.round(entrada.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, [semDados]);
  if (semDados) return <p className="cv-grafico__vazio">{vazio}</p>;
  const A = 180; const esq = 36; const base = A - 22; const topo = 12;
  const max = Math.max(...pontos.map(p => p.valor)) || 1;
  const passo = (L - esq) / pontos.length;
  const x = (i: number) => esq + passo * i + passo / 2;
  const y = (v: number) => base - (v / max) * (base - topo);
  const marcas = [0, max / 2, max];
  const cadaRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(3, Math.floor(L / 70))));
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const ativo = foco === null ? null : pontos[foco];
  return (
    <div ref={caixa} className="cv-tempo" onMouseLeave={() => setFoco(null)}>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${pontos.length} dias, máximo ${fmt(max, casas)}${unidade}`}>
        <defs>
          <linearGradient id={idGradiente} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={cor} stopOpacity=".18" /><stop offset="1" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {marcas.map(m => (
          <g key={m}>
            <line x1={esq} x2={L} y1={y(m)} y2={y(m)} className="cv-tempo__grade" />
            <text x={esq - 6} y={y(m) + 4} textAnchor="end" className="cv-tempo__eixo">{fmt(m, m < 10 ? casas : 0)}</text>
          </g>
        ))}
        {tipo === 'barras' ? pontos.map((p, i) => {
          const largura = Math.max(Math.min(passo - 4, 22), 2);
          const altura = Math.max(base - y(p.valor), p.valor > 0 ? 2 : 0);
          return <rect key={p.rotulo} x={x(i) - largura / 2} y={base - altura} width={largura} height={altura} rx="3" fill={cor} opacity={foco === null || foco === i ? 1 : .45} />;
        }) : <>
          <path d={`${linha} L${x(pontos.length - 1)},${base} L${x(0)},${base} Z`} fill={`url(#${idGradiente})`} />
          <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {ativo && foco !== null && <circle cx={x(foco)} cy={y(ativo.valor)} r="4.5" fill="#fff" stroke={cor} strokeWidth="2" />}
        </>}
        {ativo && foco !== null && tipo === 'linha' && <line x1={x(foco)} x2={x(foco)} y1={topo} y2={base} className="cv-tempo__mira" />}
        {pontos.map((p, i) => i % cadaRotulo === 0 && (
          <text key={p.rotulo} x={x(i)} y={A - 6} textAnchor="middle" className="cv-tempo__eixo">{p.rotulo}</text>
        ))}
        {pontos.map((p, i) => (
          <rect key={`alvo-${p.rotulo}`} x={x(i) - passo / 2} y={0} width={passo} height={base} fill="transparent"
            onMouseEnter={() => setFoco(i)} onClick={() => setFoco(i)} />
        ))}
      </svg>
      {ativo && foco !== null && (
        <div className="cv-dica" style={{ left: `${(x(foco) / L) * 100}%` }} role="status">
          <span>{ativo.rotulo}</span><b>{fmt(ativo.valor, casas)}{unidade}</b>
        </div>
      )}
    </div>
  );
}

/** Ranking em barras deitadas, com o número escrito ao lado de cada uma. */
export function GraficoRanking({ itens, unidade = '', vazio }: { itens: Ponto[]; unidade?: string; vazio: string }) {
  const lista = itens.filter(i => i.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 8);
  if (lista.length === 0) return <p className="cv-grafico__vazio">{vazio}</p>;
  const max = lista[0].valor;
  return (
    <ol className="cv-ranking">
      {lista.map(item => (
        <li key={item.rotulo}>
          <span>{item.rotulo}</span>
          <div><i style={{ width: `${(item.valor / max) * 100}%` }} /></div>
          <b>{fmt(item.valor)}{unidade}</b>
        </li>
      ))}
    </ol>
  );
}

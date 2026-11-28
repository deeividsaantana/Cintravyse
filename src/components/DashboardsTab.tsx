import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight, CloudRain, Fuel, Truck, Users } from 'lucide-react';
import type { Abastecimento, ControleEquipamentoDiario, DiarioObra, Equipamento, PresencaApontamento } from '../types';
import type { Solicitacao } from '../utils/solicitacoes';
import { PageHeader } from '../shared/ui';
import { TelaCheia } from '../shared/ui/TelaCheia';
import { GraficoPizza, GraficoRanking, GraficoTempo, CORES_SERIE, type Ponto } from './dashboards/Graficos';

interface DashboardsTabProps {
  abastecimentos: Abastecimento[];
  equipamentos: Equipamento[];
  controlesEquipamentos: ControleEquipamentoDiario[];
  presencasLink: PresencaApontamento[];
  diariosObra: DiarioObra[];
  solicitacoes: Solicitacao[];
  podeVer: (tab: string) => boolean;
  onNavigate: (tab: string) => void;
}

type Periodo = 7 | 30 | 90;
const PERIODOS: Array<{ dias: Periodo; rotulo: string }> = [
  { dias: 7, rotulo: '7 dias' }, { dias: 30, rotulo: '30 dias' }, { dias: 90, rotulo: '90 dias' },
];

const isoLocal = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

function diasDoPeriodo(dias: number) {
  const hoje = new Date();
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1 - i));
    return isoLocal(d);
  });
}

const rotuloDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function somarPorDia<T>(dias: string[], itens: T[], dataDe: (item: T) => string, valorDe: (item: T) => number): Ponto[] {
  const soma = new Map(dias.map(dia => [dia, 0]));
  for (const item of itens) {
    const dia = dataDe(item);
    if (soma.has(dia)) soma.set(dia, (soma.get(dia) ?? 0) + valorDe(item));
  }
  return dias.map(dia => ({ rotulo: rotuloDia(dia), valor: soma.get(dia) ?? 0 }));
}

function contar<T>(itens: T[], chave: (item: T) => string) {
  const mapa = new Map<string, number>();
  for (const item of itens) mapa.set(chave(item), (mapa.get(chave(item)) ?? 0) + 1);
  return [...mapa].map(([rotulo, valor]) => ({ rotulo, valor }));
}

const PRESENTE = new Set(['Presente', 'Atraso', 'Saída antecipada']);

export default function DashboardsTab(props: DashboardsTabProps) {
  const { podeVer, onNavigate } = props;
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const telaRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!telaRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      telaRef.current.querySelectorAll('.cv-grafico'),
      { opacity: 0.6, y: 6 },
      { opacity: 1, y: 0, duration: 0.22, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }, { scope: telaRef, dependencies: [periodo] });

  const dados = useMemo(() => {
    const dias = diasDoPeriodo(periodo);
    const dentro = new Set(dias);
    const prefixo = new Map(props.equipamentos.map(e => [e.id, e.prefixo]));
    const abast = props.abastecimentos.filter(a => dentro.has(a.data));
    const presencas = props.presencasLink.filter(p => dentro.has(p.data) && !p.inativoEm);
    const chuvas = props.diariosObra.filter(d => d.ativo !== false && dentro.has(d.data));
    const controles = props.controlesEquipamentos.filter(c => dentro.has(c.data));
    const ultimoDia = controles.reduce((maior, c) => (c.data > maior ? c.data : maior), '');
    const frotaDoDia = controles.filter(c => c.data === ultimoDia);
    const pedidos = props.solicitacoes.filter(s => dentro.has(s.abertaEm.slice(0, 10)));
    const litros = abast.reduce((soma, a) => soma + (a.quantidadeLitros || 0), 0);
    const presentesPorDia = somarPorDia(dias, presencas, p => p.data, p => (PRESENTE.has(p.status) ? 1 : 0));
    const diasComPresenca = presentesPorDia.filter(p => p.valor > 0);
    return {
      litros,
      litrosPorDia: somarPorDia(dias, abast, a => a.data, a => a.quantidadeLitros || 0),
      litrosPorMaquina: [...abast.reduce((mapa, a) => {
        const nome = prefixo.get(a.equipamentoId) || a.prefixoInformado || 'Sem prefixo';
        return mapa.set(nome, (mapa.get(nome) ?? 0) + (a.quantidadeLitros || 0));
      }, new Map<string, number>())].map(([rotulo, valor]) => ({ rotulo, valor })),
      frotaDoDia: contar(frotaDoDia, c => c.status),
      ultimoDia,
      emOperacao: frotaDoDia.filter(c => c.status === 'Em operação').length,
      presentesPorDia,
      mediaPresentes: diasComPresenca.length ? diasComPresenca.reduce((s, p) => s + p.valor, 0) / diasComPresenca.length : 0,
      presencaPorSituacao: contar(presencas, p => p.status),
      chuvaPorDia: somarPorDia(dias, chuvas, d => d.data, d => d.precipitacaoMm ?? 0),
      chuvaTotal: chuvas.reduce((s, d) => s + (d.precipitacaoMm ?? 0), 0),
      pedidosPorEtapa: contar(pedidos, s => s.etapa),
      pedidos: pedidos.length,
    };
  }, [periodo, props.abastecimentos, props.equipamentos, props.presencasLink, props.diariosObra, props.controlesEquipamentos, props.solicitacoes]);

  const fmt = (valor: number, casas = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(valor);
  const numeros = [
    podeVer('controle-equipamentos') && { rotulo: 'Máquinas em operação', valor: dados.ultimoDia ? fmt(dados.emOperacao) : '—', detalhe: dados.ultimoDia ? `em ${rotuloDia(dados.ultimoDia)}` : 'sem lançamento no período', icone: Truck, borda: 'border-t-[#176b4d]', aba: 'controle-equipamentos' },
    podeVer('lancamentos') && { rotulo: 'Diesel no período', valor: `${fmt(dados.litros)} L`, detalhe: `${PERIODOS.find(p => p.dias === periodo)?.rotulo}`, icone: Fuel, borda: 'border-t-sky-700', aba: 'lancamentos' },
    podeVer('presenca') && { rotulo: 'Presentes por dia', valor: fmt(dados.mediaPresentes), detalhe: 'média dos dias lançados', icone: Users, borda: 'border-t-[#176b4d]', aba: 'presenca' },
    podeVer('pluviometro') && { rotulo: 'Chuva no período', valor: `${fmt(dados.chuvaTotal, 1)} mm`, detalhe: `${dados.chuvaPorDia.filter(d => d.valor > 0).length} dias com chuva`, icone: CloudRain, borda: 'border-t-[#c2410c]', aba: 'pluviometro' },
  ].filter(Boolean) as Array<{ rotulo: string; valor: string; detalhe: string; icone: typeof Truck; borda: string; aba: string }>;

  const Cartao = ({ titulo, sub, aba, largo, children }: { titulo: string; sub: string; aba: string; largo?: boolean; children: React.ReactNode }) => (
    <section className={`cv-grafico${largo ? ' cv-grafico--largo' : ''}`} aria-label={titulo}>
      <header>
        <div><h2>{titulo}</h2><p>{sub}</p></div>
        <button type="button" onClick={() => onNavigate(aba)}>Abrir ›</button>
      </header>
      {children}
    </section>
  );

  return (
    <TelaCheia ref={telaRef} id="dashboards-tab" rotulo="Dashboards" longa rotuloDados="Gráficos da operação"
      cabecalho={<PageHeader title="Dashboards" />}
    >
      {/* Faixa analítica Floresta com seletor de janela */}
      <section className="cv-hero-floresta flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white">
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.02em] text-white">Telemetria da Operação</h2>
          <p className="mt-0.5 text-[12.5px] text-emerald-100">
            Indicadores consolidados dos últimos {periodo} dias em frota, diesel, efetivo e clima.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-white/15" role="group" aria-label="Período dos gráficos">
          {PERIODOS.map(p => (
            <button
              key={p.dias}
              type="button"
              aria-pressed={periodo === p.dias}
              onClick={() => setPeriodo(p.dias)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                periodo === p.dias ? 'bg-white text-emerald-950' : 'text-emerald-100 hover:text-white'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </section>

      {numeros.length > 0 && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo do período">
          {numeros.map(n => {
            const Icone = n.icone;
            return (
              <button
                key={n.rotulo}
                type="button"
                onClick={() => onNavigate(n.aba)}
                className={`group flex flex-col justify-between rounded-2xl border border-slate-200 border-t-[3px] ${n.borda} bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(11,27,22,0.05)] transition-colors hover:bg-slate-50`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-">{n.rotulo}</span>
                  <Icone className="size-4 text-[#176b4d]" aria-hidden="true" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <strong className="text-[1.5rem] font-semibold tracking-[-0.025em] tabular-nums text-slate-900">{n.valor}</strong>
                  <ArrowUpRight className="size-3.5 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                </div>
                <span className="mt-1 text-xs text-">{n.detalhe}</span>
              </button>
            );
          })}
        </section>
      )}

      <div className="cv-graficos">
        {podeVer('lancamentos') && (
          <Cartao titulo="Diesel por dia" sub="Litros abastecidos em cada dia" aba="lancamentos" largo>
            <GraficoTempo pontos={dados.litrosPorDia} unidade="L" cor={CORES_SERIE[0]} tipo="barras" vazio="Nenhum abastecimento no período." />
          </Cartao>
        )}
        {podeVer('controle-equipamentos') && (
          <Cartao titulo="Situação da frota" sub={dados.ultimoDia ? `Posição de ${rotuloDia(dados.ultimoDia)}` : 'Último dia lançado'} aba="controle-equipamentos">
            <GraficoPizza fatias={dados.frotaDoDia} vazio="Nenhuma máquina lançada no período." />
          </Cartao>
        )}
        {podeVer('presenca') && (
          <Cartao titulo="Presentes por dia" sub="Pessoas presentes nos apontamentos" aba="presenca" largo>
            <GraficoTempo pontos={dados.presentesPorDia} unidade="pessoas" cor={CORES_SERIE[1]} tipo="linha" vazio="Nenhum apontamento no período." />
          </Cartao>
        )}
        {podeVer('presenca') && (
          <Cartao titulo="Presença por situação" sub="Todos os apontamentos do período" aba="presenca">
            <GraficoPizza fatias={dados.presencaPorSituacao} vazio="Nenhum apontamento no período." />
          </Cartao>
        )}
        {podeVer('pluviometro') && (
          <Cartao titulo="Chuva por dia" sub="Leitura do pluviômetro, em mm" aba="pluviometro" largo>
            <GraficoTempo pontos={dados.chuvaPorDia} unidade="mm" cor={CORES_SERIE[2]} tipo="barras" vazio="Sem chuva lançada no período." />
          </Cartao>
        )}
        {podeVer('solicitacoes') && (
          <Cartao titulo="Pedidos por etapa" sub={`${dados.pedidos} pedidos abertos no período`} aba="solicitacoes">
            <GraficoPizza fatias={dados.pedidosPorEtapa} vazio="Nenhum pedido aberto no período." />
          </Cartao>
        )}
        {podeVer('lancamentos') && dados.litrosPorMaquina.length > 0 && (
          <Cartao titulo="Quem mais consumiu diesel" sub="Máquinas no período" aba="lancamentos" largo>
            <GraficoRanking itens={dados.litrosPorMaquina} unidade="L" vazio="Nenhum abastecimento no período." />
          </Cartao>
        )}
      </div>
    </TelaCheia>
  );
}

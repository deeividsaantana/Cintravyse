import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowUpRight,
  CalendarRange,
  ClipboardList,
  CloudRain,
  FileSignature,
  Fuel,
  Gauge,
  Hammer,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../shared/ui';
import { TelaCheia } from '../shared/ui/TelaCheia';

export interface RelatorioDoCatalogo {
  id: string;
  nome: string;
  descricao: string;
  area: string;
  icone: LucideIcon;
  aba: string;
  parte: string;
  formatos: string[];
}

export const CATALOGO_DE_RELATORIOS: RelatorioDoCatalogo[] = [
  { id: 'chuva-mensal', nome: 'Mapa de chuvas do mês', descricao: 'Chuva de cada dia, dias impraticáveis e horas paradas. Serve para pedir prorrogação de prazo.', area: 'Operação', icone: CloudRain, aba: 'pluviometro', parte: 'resumo', formatos: ['PDF'] },
  { id: 'avanco-fisico', nome: 'Avanço físico', descricao: 'Quanto de cada atividade foi feito contra o previsto, por frente.', area: 'Operação', icone: CalendarRange, aba: 'programacao', parte: 'avanco', formatos: ['PDF', 'Excel'] },
  { id: 'apontamentos', nome: 'Apontamentos de produção', descricao: 'O que foi produzido em cada dia, por atividade e responsável.', area: 'Operação', icone: ClipboardList, aba: 'programacao', parte: 'producao', formatos: ['Excel'] },
  { id: 'estacas', nome: 'Relatório de estacas', descricao: 'Estacas cravadas, faltantes e metros por cortina.', area: 'Operação', icone: Hammer, aba: 'estacas', parte: 'relatorios', formatos: ['PDF', 'Excel'] },
  { id: 'compras-periodo', nome: 'Pedidos de compra do período', descricao: 'Pedidos abertos, entregues e atrasados, com prazo e valor.', area: 'Suprimentos', icone: ShoppingCart, aba: 'solicitacoes', parte: 'relatorio', formatos: ['PDF', 'Excel'] },
  { id: 'frota-dia', nome: 'Relatórios da frota', descricao: 'Relatório do dia, quem faltou lançar e resumo da semana das máquinas.', area: 'Frota', icone: Truck, aba: 'controle-equipamentos', parte: 'fechamento', formatos: ['PDF', 'Excel'] },
  { id: 'manutencao-dia', nome: 'Manutenção do dia', descricao: 'Máquinas paradas, horas paradas e ordens de serviço do dia.', area: 'Frota', icone: Wrench, aba: 'manutencao', parte: 'manutencao-dia', formatos: ['Excel'] },
  { id: 'diesel', nome: 'Fornecimento de diesel', descricao: 'Litros por comboio e por dia, com o total do período.', area: 'Frota', icone: Fuel, aba: 'lancamentos', parte: 'resumo', formatos: ['PDF', 'Excel'] },
  { id: 'consumo-maquina', nome: 'Consumo por máquina', descricao: 'Litros e média de consumo de cada máquina no período.', area: 'Frota', icone: Gauge, aba: 'lancamentos', parte: 'consumo', formatos: ['Excel'] },
  { id: 'presenca', nome: 'Relatório de presença', descricao: 'Presentes, faltas e atestados por equipe e por pessoa.', area: 'Pessoas', icone: Users, aba: 'presenca', parte: 'relatorios', formatos: ['PDF', 'Excel'] },
  { id: 'contratacao', nome: 'Resumo de contratações', descricao: 'Pedidos de contratação, promoção e desligamento por etapa de assinatura.', area: 'Pessoas', icone: FileSignature, aba: 'contratacao', parte: 'painel', formatos: ['PDF'] },
];

interface RelatoriosTabProps {
  podeVer: (tab: string) => boolean;
  onAbrir: (relatorio: RelatorioDoCatalogo) => void;
}

export default function RelatoriosTab({ podeVer, onAbrir }: RelatoriosTabProps) {
  const [busca, setBusca] = useState('');
  const [areaAtiva, setAreaAtiva] = useState<string>('Todas');
  const telaRef = useRef<HTMLElement>(null);

  const disponiveis = useMemo(() => CATALOGO_DE_RELATORIOS.filter(r => podeVer(r.aba)), [podeVer]);
  const areas = useMemo(() => ['Todas', ...new Set(disponiveis.map(r => r.area))], [disponiveis]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return disponiveis.filter(r => {
      if (areaAtiva !== 'Todas' && r.area !== areaAtiva) return false;
      if (!termo) return true;
      return `${r.nome} ${r.descricao} ${r.area}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [areaAtiva, busca, disponiveis]);

  useGSAP(() => {
    if (!telaRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      telaRef.current.querySelectorAll('[data-relatorio-card]'),
      { opacity: 0.65, y: 6 },
      { opacity: 1, y: 0, duration: 0.2, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }, { scope: telaRef, dependencies: [areaAtiva] });

  return (
    <TelaCheia
      ref={telaRef}
      id="relatorios-tab"
      rotulo="Relatórios"
      longa
      rotuloDados="Central de relatórios"
      cabecalho={<PageHeader title="Relatórios" description="Central de exportação em PDF e Excel por frente operacional." />}
    >
      {/* Faixa de comando Floresta da Central de Relatórios */}
      <section className="cv-hero-floresta flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white">
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.02em] text-white">Central de Relatórios</h2>
          <p className="mt-0.5 text-[12.5px] text-emerald-100">
            {disponiveis.length} modelos oficiais prontos para emissão em PDF e planilha Excel.
          </p>
        </div>
        <label className="relative flex w-full max-w-xs items-center rounded-lg bg-white/10 px-3 ring-1 ring-white/20 focus-within:bg-white/15 focus-within:ring-emerald-400">
          <Search className="size-3.5 shrink-0 text-emerald-200" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar relatório…"
            aria-label="Buscar relatório"
            className="h-9 w-full bg-transparent px-2 text-[12.5px] text-white outline-none placeholder:text-emerald-200"
          />
        </label>
      </section>

      {/* Filtros por área */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap gap-1.5" role="group" aria-label="Filtrar relatórios por área">
          {areas.map(area => {
            const ativo = areaAtiva === area;
            return (
              <button
                key={area}
                type="button"
                aria-pressed={ativo}
                onClick={() => setAreaAtiva(area)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  ativo
                    ? 'bg-[#176b4d] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#176b4d] hover:text-[#176b4d]'
                }`}
              >
                {area}
              </button>
            );
          })}
        </div>
        <span className="text-[12px] font-medium text- tabular-nums">
          {visiveis.length} {visiveis.length === 1 ? 'relatório' : 'relatórios'}
        </span>
      </div>

      {/* Grade Bento 3 colunas densa */}
      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Nenhum relatório encontrado para esse filtro.
        </div>
      ) : (
        <div className="grid grid-flow-dense gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map(r => {
            const Icone = r.icone;
            return (
              <button
                key={r.id}
                type="button"
                data-relatorio-card
                data-testid={`relatorio-${r.id}`}
                onClick={() => onAbrir(r)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(11,27,22,0.05)] transition-colors hover:border-[#176b4d] hover:bg-slate-50"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#176b4d] transition-colors group-hover:bg-[#176b4d] group-hover:text-white">
                      <Icone className="size-4" aria-hidden="true" />
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {r.area}
                    </span>
                  </div>
                  <strong className="mt-3 block text-[14px] font-semibold text-slate-900">{r.nome}</strong>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-">{r.descricao}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex gap-1.5">
                    {r.formatos.map(f => (
                      <span key={f} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#176b4d]">
                    Abrir <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </TelaCheia>
  );
}

import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CalendarRange, ClipboardList, CloudRain, FileSignature, Fuel, Gauge, Hammer, Search, ShoppingCart, Truck, Users, Wrench, type LucideIcon } from 'lucide-react';
import { PageHeader, TextInput } from '../shared/ui';
import { TelaCheia } from '../shared/ui/TelaCheia';

/** Um relatório do sistema: onde ele mora e em que parte da aba abre. */
export interface RelatorioDoCatalogo {
  id: string;
  nome: string;
  descricao: string;
  area: string;
  icone: LucideIcon;
  /** Tela dona dos dados (e da permissão de ver). */
  aba: string;
  /** Qual relatório da tela abre aqui. */
  parte: string;
  formatos: string[];
}

/**
 * Todos os relatórios do sistema num lugar só (pedido do Deivid em
 * 25/11/2026). Desde 26/11 o relatório abre aqui mesmo, com filtros, PDF e
 * Excel: as outras telas não têm mais aba de relatório. A ordem segue o menu.
 */
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
  /** A pessoa abre a aba? Relatório de aba fechada não aparece. */
  podeVer: (tab: string) => boolean;
  onAbrir: (relatorio: RelatorioDoCatalogo) => void;
}

export default function RelatoriosTab({ podeVer, onAbrir }: RelatoriosTabProps) {
  const [busca, setBusca] = useState('');
  const telaRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!telaRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(telaRef.current.querySelectorAll('.cv-relatorios__grupo'), { opacity: .5 }, { opacity: 1, duration: .15, ease: 'power1.out', clearProps: 'opacity' });
  }, { scope: telaRef, dependencies: [] });

  const grupos = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const visiveis = CATALOGO_DE_RELATORIOS.filter(r => podeVer(r.aba)
      && (!termo || `${r.nome} ${r.descricao} ${r.area}`.toLocaleLowerCase('pt-BR').includes(termo)));
    const porArea = new Map<string, RelatorioDoCatalogo[]>();
    for (const r of visiveis) porArea.set(r.area, [...(porArea.get(r.area) ?? []), r]);
    return [...porArea];
  }, [busca, podeVer]);

  return (
    <TelaCheia ref={telaRef} id="relatorios-tab" rotulo="Relatórios" longa rotuloDados="Lista de relatórios"
      cabecalho={<PageHeader title="Relatórios" description="Escolha o relatório: ele abre aqui, com filtros, PDF e Excel." />}
      faixa={(
        <TextInput type="search" icon={Search} value={busca} onChange={evento => setBusca(evento.target.value)}
          placeholder="Buscar relatório" aria-label="Buscar relatório" className="max-w-md" />
      )}
    >
      {grupos.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhum relatório encontrado.</p>}
      {grupos.map(([area, lista]) => (
        <section key={area} className="cv-relatorios__grupo" aria-label={area}>
          <h2>{area}</h2>
          <ul>
            {lista.map(r => {
              const Icone = r.icone;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onAbrir(r)} data-testid={`relatorio-${r.id}`}>
                    <span className="cv-relatorios__icone" aria-hidden="true"><Icone className="size-4" /></span>
                    <span className="min-w-0">
                      <strong>{r.nome}</strong>
                      <small>{r.descricao}</small>
                    </span>
                    <span className="cv-relatorios__formatos">{r.formatos.map(f => <em key={f}>{f}</em>)}</span>
                    <span className="cv-relatorios__abrir" aria-hidden="true">Abrir ›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </TelaCheia>
  );
}

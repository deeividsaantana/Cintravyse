import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { CheckCircle2, NotebookPen, Plus, X } from 'lucide-react';
import type { CondicaoClimatica, DiarioObra, ObraLocal } from '../types';
import { AbasDaTela } from '../shared/ui/AbasDaTela';
import { PageHeader } from '../shared/ui/PageHeader';
import { VoltarAosRelatorios, type ModoRelatorio } from '../shared/ui/RelatorioNaAba';
import { TelaCheia } from '../shared/ui/TelaCheia';
import MapaChuva from './MapaChuva';
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, CARTAO } from './cadastros/estilos';
import { Modal } from '../shared/ui/Modal';
import { Campo, Etapa } from '../shared/ui/Lancamento';
import { useAtalhoNovo } from '../shared/hooks/useAtalhoNovo';
import { mesesComDiario, montarMesDeChuva } from '../utils/mapaChuva';

interface PluviometroTabProps {
  diarios: DiarioObra[];
  obras: ObraLocal[];
  responsavel: string;
  podeEditar: boolean;
  onSave: (diario: DiarioObra, isNew: boolean) => void;
  /** Aberto pela guia Relatórios: mostra só o mapa de chuvas do mês. */
  relatorio?: ModoRelatorio;
}

const CLIMAS: CondicaoClimatica[] = ['Bom', 'Nublado', 'Chuva fraca', 'Chuva forte', 'Impraticável'];
const hoje = new Date();

export default function PluviometroTab({ diarios, obras, responsavel, podeEditar, onSave, relatorio }: PluviometroTabProps) {
  const escopo = useRef<HTMLElement>(null);
  const meses = useMemo(() => {
    const encontrados = mesesComDiario(diarios);
    return encontrados.length > 0 ? encontrados : [{ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }];
  }, [diarios]);
  const [mesSelecionado, setMesSelecionado] = useState(`${meses[0].ano}-${String(meses[0].mes).padStart(2, '0')}`);
  // O mapa de chuvas (resumo) só abre pela guia Relatórios (25/11/2026).
  const aba: 'resumo' | 'lancamentos' = relatorio ? 'resumo' : 'lancamentos';
  const [aberto, setAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(`${mesSelecionado}-01`);
  const [obraId, setObraId] = useState('');
  const [rascunho, setRascunho] = useState<Partial<DiarioObra>>({});
  const [ano, mes] = mesSelecionado.split('-').map(Number);
  const registrosDoMes = useMemo(
    () => diarios.filter(item => item.ativo !== false && item.data.startsWith(mesSelecionado)),
    [diarios, mesSelecionado],
  );
  // Procura em todos os registros: trocar o dia para outro mês corrige o que
  // já existe em vez de criar um repetido.
  const diario = diarios.find(item => item.ativo !== false && item.data === diaSelecionado && (item.obraId || '') === obraId);
  const valor = { ...diario, ...rascunho };
  const resumo = useMemo(() => montarMesDeChuva(diarios, ano, mes), [diarios, ano, mes]);

  useGSAP(() => {
    if (!escopo.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(escopo.current.querySelectorAll('[data-pluviometro-reveal]'), { opacity: 0, y: 12 }, {
      opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity',
    });
  }, { scope: escopo, dependencies: [aba, mesSelecionado] });

  const trocarMes = (valorMes: string) => {
    setMesSelecionado(valorMes);
    setDiaSelecionado(`${valorMes}-01`);
    setRascunho({});
  };

  const salvar = () => {
    const agora = new Date().toISOString();
    onSave({
      id: diario?.id || `diario-${diaSelecionado}-${obraId || 'geral'}`,
      data: diaSelecionado,
      obraId: obraId || undefined,
      climaManha: (valor.climaManha as CondicaoClimatica) || 'Bom',
      climaTarde: (valor.climaTarde as CondicaoClimatica) || 'Bom',
      horasParadasClima: Number(valor.horasParadasClima) || undefined,
      precipitacaoMm: Number(valor.precipitacaoMm) || undefined,
      visitas: valor.visitas?.trim() || undefined,
      observacao: valor.observacao?.trim() || undefined,
      fotos: valor.fotos,
      responsavel: diario?.responsavel || responsavel,
      ativo: diario?.ativo ?? true,
      criadoEm: diario?.criadoEm || agora,
      atualizadoEm: agora,
    }, !diario);
    setRascunho({});
    setAberto(false);
  };

  const abrir = (dia: string, obra = '') => {
    setDiaSelecionado(dia);
    setObraId(obra);
    setRascunho({});
    setAberto(true);
  };
  const diaDeHoje = () => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  };
  useAtalhoNovo(() => abrir(diaDeHoje()), podeEditar && !aberto);


  return (
    <TelaCheia
      ref={escopo}
      id="pluviometro-tab"
      rotulo="Pluviômetro"
      longa
      rotuloDados="Resumo e lançamentos do pluviômetro"
      cabecalho={(
        <PageHeader
          eyebrow="Obra"
          title="Pluviômetro"
          abas={relatorio ? <VoltarAosRelatorios relatorio={relatorio} /> : (
            <AbasDaTela
              id="pluviometro"
              rotulo="Subtelas do pluviômetro"
              ativa={aba}
              onTrocar={() => undefined}
              idPainel="pluviometro-dados"
              testId="pluviometro-abas"
              abas={[
                { id: 'lancamentos', rotulo: 'Lançamentos', icone: NotebookPen, contador: registrosDoMes.length, contadorRotulo: 'registros no mês', tom: 'neutro' },
              ]}
            />
          )}
          actions={(
            <>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
              <span>Mês e ano</span>
              <select value={mesSelecionado} onChange={event => trocarMes(event.target.value)} className="bg-transparent py-2 text-sm text-slate-900" aria-label="Filtrar mês e ano">
                {meses.map(item => (
                  <option key={`${item.ano}-${item.mes}`} value={`${item.ano}-${String(item.mes).padStart(2, '0')}`}>
                    {new Date(item.ano, item.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </label>
            {podeEditar && !relatorio && (
              <button type="button" onClick={() => abrir(diaDeHoje())} className={`${BOTAO_PRIMARIO} max-sm:order-first px-5`} data-testid="pluviometro-novo">
                <Plus className="size-5" aria-hidden="true" /> Novo lançamento
              </button>
            )}
            </>
          )}
        />
      )}
    >
      <div id="pluviometro-dados" role="tabpanel" data-pluviometro-reveal className="space-y-4">
        {aba === 'resumo' ? (
          <MapaChuva diarios={diarios} responsavel={responsavel} mesSelecionado={{ ano, mes }} ocultarFiltro />
        ) : (
          <>
            <div className="renea-faixa-numeros grid-cols-2 lg:grid-cols-4">
              <div className="px-3.5 py-2.5">
                <span className="block text-[12px] font-medium text-">Chuva acumulada</span>
                <strong className="mt-1 block text-[1.375rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-900">{resumo.totalMm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mm</strong>
                <span className="mt-1 block text-xs text-">no mês selecionado</span>
              </div>
              <div className="px-3.5 py-2.5">
                <span className="block text-[12px] font-medium text-">Dias com chuva</span>
                <strong className="mt-1 block text-[1.375rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#176b4d]">{resumo.diasComChuva}</strong>
                <span className="mt-1 block text-xs text-">{resumo.diasImpraticaveis} impraticáveis</span>
              </div>
              <div className="px-3.5 py-2.5">
                <span className="block text-[12px] font-medium text-">Horas paradas</span>
                <strong className="mt-1 block text-[1.375rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#c2410c]">{resumo.horasParadas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h</strong>
                <span className="mt-1 block text-xs text-">impacto climático</span>
              </div>
              <div className="px-3.5 py-2.5">
                <span className="block text-[12px] font-medium text-">Dias sem registro</span>
                <strong className="mt-1 block text-[1.375rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-900">{resumo.diasSemDiario}</strong>
                <span className="mt-1 block text-xs text-">aguardando leitura</span>
              </div>
            </div>
            <section className={`${CARTAO} min-w-0 overflow-hidden`}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h2 className="text-[13.5px] font-semibold text-slate-900">Lançamentos do mês</h2>
                <span className="shrink-0 text-[12px] font-medium text-">{resumo.diasComChuva} com chuva · {resumo.diasSemDiario} sem registro</span>
              </div>
              <div className="divide-y divide-slate-100">
                {registrosDoMes.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                    <span className="mb-3 grid size-11 place-items-center rounded-xl bg-emerald-50 text-[#176b4d] ring-1 ring-inset ring-emerald-200">
                      <NotebookPen className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-[14px] font-semibold text-slate-900">Nenhum lançamento neste mês</p>
                    <p className="mt-1 max-w-sm text-[12.5px] text-">
                      {podeEditar ? 'Registre a leitura diária do pluviômetro para compor o mapa de chuvas. Toque em "Novo lançamento" ou aperte N.' : 'Ainda não há leituras registradas neste período.'}
                    </p>
                    {podeEditar && (
                      <button type="button" onClick={() => abrir(diaDeHoje())} className={`${BOTAO_PRIMARIO} mt-4`}>
                        <Plus className="size-4" aria-hidden="true" /> Registrar leitura de hoje
                      </button>
                    )}
                  </div>
                )}
                {[...registrosDoMes].sort((a, b) => b.data.localeCompare(a.data)).map(item => (
                  <button key={item.id} type="button" onClick={() => abrir(item.data, item.obraId || '')} className="grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto_5rem] items-center gap-4 px-4 py-2 text-left text-[13px] transition-colors hover:bg-slate-50">
                    <span className="truncate font-medium tabular-nums text-slate-900">{new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')}{item.obraId ? <span className="font-normal text-"> · {obras.find(obra => obra.id === item.obraId)?.nome ?? 'Obra'}</span> : ''}</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                      <span aria-hidden="true" className={`size-2 rounded-full ${/impratic/i.test(item.climaManha ?? '') ? 'bg-rose-500' : Number(item.precipitacaoMm) > 0 ? 'bg-sky-500' : 'bg-slate-500'}`} />
                      {item.climaManha}
                    </span>
                    <span className="text-right font-semibold tabular-nums text-slate-900">{item.precipitacaoMm ?? 0} <span className="font-normal text-">mm</span></span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <Modal
        open={aberto}
        lancamento
        title={diario ? 'Corrigir lançamento do pluviômetro' : 'Novo lançamento do pluviômetro'}
        description="Dia, chuva e horas paradas. Um registro por dia e obra."
        onClose={() => setAberto(false)}
        onSubmit={podeEditar ? salvar : undefined}
        footer={(
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={() => setAberto(false)} className={BOTAO_SECUNDARIO}><X className="size-4" aria-hidden="true" />Fechar</button>
            {podeEditar && <button type="button" onClick={salvar} className={`${BOTAO_PRIMARIO} sm:min-w-40`} data-testid="pluviometro-salvar"><CheckCircle2 className="size-4" aria-hidden="true" />{diario ? 'Salvar correção' : 'Salvar'}</button>}
          </div>
        )}
      >
        <fieldset disabled={!podeEditar} className="grid max-w-3xl gap-4">
          <legend className="sr-only">Dados do dia</legend>
          <Etapa numero={1} titulo="Qual dia e obra?" feita={Boolean(diaSelecionado)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Dia" para="pluv-dia" obrigatorio>
                <input id="pluv-dia" type="date" value={diaSelecionado} onChange={event => { if (event.target.value) { setDiaSelecionado(event.target.value); setRascunho({}); } }} className={CAMPO} />
              </Campo>
              <Campo rotulo="Obra" para="pluv-obra">
                <select id="pluv-obra" value={obraId} onChange={event => { setObraId(event.target.value); setRascunho({}); }} className={CAMPO}>
                  <option value="">Obra geral</option>
                  {obras.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </Campo>
            </div>
          </Etapa>
          <Etapa numero={2} titulo="Como foi o tempo?" ajuda="Pluviômetro em milímetros; em branco quando não mediu." feita={valor.precipitacaoMm !== undefined}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['climaManha', 'climaTarde'] as const).map(campo => (
                <Campo key={campo} rotulo={campo === 'climaManha' ? 'Clima de manhã' : 'Clima à tarde'} para={`pluv-${campo}`}>
                  <select id={`pluv-${campo}`} value={(valor[campo] as string) || 'Bom'} onChange={event => setRascunho({ ...rascunho, [campo]: event.target.value })} className={CAMPO}>
                    {CLIMAS.map(item => <option key={item}>{item}</option>)}
                  </select>
                </Campo>
              ))}
              <Campo rotulo="Pluviômetro (mm)" para="pluv-mm">
                <input id="pluv-mm" type="number" inputMode="decimal" min="0" step="0.5" value={valor.precipitacaoMm ?? ''} onChange={event => setRascunho({ ...rascunho, precipitacaoMm: event.target.value === '' ? undefined : Number(event.target.value) })} className={CAMPO} />
              </Campo>
              <Campo rotulo="Horas paradas por chuva" para="pluv-horas">
                <input id="pluv-horas" type="number" inputMode="decimal" min="0" step="0.5" value={valor.horasParadasClima ?? ''} onChange={event => setRascunho({ ...rascunho, horasParadasClima: event.target.value === '' ? undefined : Number(event.target.value) })} className={CAMPO} />
              </Campo>
            </div>
          </Etapa>
        </fieldset>
      </Modal>
    </TelaCheia>
  );
}

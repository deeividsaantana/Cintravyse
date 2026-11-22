import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import type { Cargo, Empresa, Funcionario, GrupoEquipe } from '../../types';
import { isActiveCollaborator } from '../../masterData/centralRegistry';
import { chaveDoCargo, equipePorPessoa, linhaDeComando, mapaDeCargos, montarEstrutura } from '../../utils/hierarquia';
import { normalizarBusca } from '../../utils/cadastrosLista';
import { BOTAO_SECUNDARIO, CAMPO, FOCO } from './estilos';
import { imprimirEmUmaFolha } from '../../utils/imprimirEmUmaFolha';

interface Props {
  funcionarios: readonly Funcionario[];
  cargos: readonly Cargo[];
  empresas: readonly Empresa[];
  gruposEquipe: readonly GrupoEquipe[];
  /** Pessoa que abre já escolhida (botão "Ver no organograma" da ficha). */
  focoId?: string | null;
  onAbrirPessoa: (id: string) => void;
}

// Cor da borda de cada nível: do verde-escuro do topo ao claro da base.
const COR_DO_NIVEL = ['#022b24', '#063c31', '#0f5a3d', '#176b4d', '#3f8f6e', '#7fb59b', '#b9c6bf'];

/**
 * Organograma montado na hora a partir de quem lidera quem no cadastro de
 * colaboradores. Mostra uma linha por nível: o topo, depois quem responde a
 * quem foi escolhido na linha de cima. Tocar numa pessoa abre a linha de
 * baixo; tocar de novo abre a ficha. Assim cabe uma obra de 400 pessoas sem
 * desenhar todo mundo de uma vez.
 */
export default function Organograma({ funcionarios, cargos, empresas, gruposEquipe, focoId, onAbrirPessoa }: Props) {
  const folhaRef = useRef<HTMLDivElement>(null);
  const [busca, setBusca] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [caminho, setCaminho] = useState<string[]>([]);

  const pessoas = useMemo(
    () => funcionarios.filter(isActiveCollaborator).filter(item => !empresaId || item.empresaId === empresaId),
    [funcionarios, empresaId],
  );
  const estrutura = useMemo(() => montarEstrutura(pessoas, cargos), [pessoas, cargos]);
  const cadastroDeCargos = useMemo(() => mapaDeCargos(cargos), [cargos]);
  const equipes = useMemo(() => equipePorPessoa(gruposEquipe), [gruposEquipe]);
  const porId = useMemo(() => new Map(pessoas.map(item => [item.id, item])), [pessoas]);
  const empresasComGente = useMemo(() => {
    const ids = new Set(funcionarios.filter(isActiveCollaborator).map(item => item.empresaId));
    return empresas.filter(item => ids.has(item.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [funcionarios, empresas]);

  const irPara = (id: string) => {
    const pessoa = porId.get(id);
    if (!pessoa) return;
    setCaminho(linhaDeComando(pessoa, estrutura).map(item => item.id));
  };

  // Vem da ficha: já abre a linha de comando da pessoa.
  useEffect(() => {
    if (focoId) irPara(focoId);
  }, [focoId, estrutura]);

  const encontrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return [];
    return pessoas.filter(item => normalizarBusca(`${item.nome} ${item.matricula || ''} ${item.cargo}`).includes(termo)).slice(0, 8);
  }, [busca, pessoas]);

  // Linhas: o topo e, a cada pessoa escolhida, quem ela lidera.
  const linhas: Funcionario[][] = [estrutura.topo];
  caminho.forEach(id => {
    const abaixo = estrutura.liderados.get(id);
    if (abaixo && abaixo.length > 0) linhas.push(abaixo);
  });

  const nivelDe = (pessoa: Funcionario) => cadastroDeCargos.get(chaveDoCargo(pessoa.cargo))?.nivel ?? 7;

  const tocar = (pessoa: Funcionario, linha: number) => {
    if (caminho[linha] === pessoa.id) {
      onAbrirPessoa(pessoa.id);
      return;
    }
    setCaminho([...caminho.slice(0, linha), pessoa.id]);
  };

  const cartao = (pessoa: Funcionario, linha: number) => {
    const escolhido = caminho[linha] === pessoa.id;
    const diretos = estrutura.liderados.get(pessoa.id)?.length || 0;
    const total = estrutura.abaixo.get(pessoa.id) || 0;
    const equipe = equipes.get(pessoa.id)?.nome;
    return (
      <button
        key={pessoa.id}
        type="button"
        onClick={() => tocar(pessoa, linha)}
        aria-pressed={escolhido}
        title={escolhido ? 'Tocar de novo abre a ficha' : diretos > 0 ? `Ver quem responde a ${pessoa.nome}` : 'Tocar de novo abre a ficha'}
        data-testid="organograma-pessoa"
        style={{ borderLeftColor: COR_DO_NIVEL[nivelDe(pessoa) - 1] }}
        className={`w-56 shrink-0 rounded-xl border border-l-4 bg-white p-3 text-left transition-colors duration-150 ${FOCO} ${escolhido ? 'border-[#176b4d] ring-2 ring-[#176b4d]/25' : 'border-slate-200 hover:border-emerald-300'}`}
      >
        <span className="flex items-start justify-between gap-2">
          <strong className="min-w-0 truncate text-sm text-slate-900">{pessoa.nome}</strong>
          {total > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-2 text-xs font-bold tabular-nums text-slate-600" aria-label={`${total} pessoas abaixo`}>{total}</span>}
        </span>
        <span className="block truncate text-xs text-slate-500">{[pessoa.cargo, equipe].filter(Boolean).join(' · ') || 'Sem cargo'}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3" data-testid="organograma">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 print:hidden">
        <div className="relative min-w-0 basis-full sm:min-w-64 sm:flex-1 sm:basis-auto">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input type="search" aria-label="Achar uma pessoa no organograma" placeholder="Achar uma pessoa" value={busca} onChange={event => setBusca(event.target.value)} className={`${CAMPO} pl-11`} />
          {encontrados.length > 0 && (
            <ul className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {encontrados.map(item => (
                <li key={item.id}>
                  <button type="button" onClick={() => { irPara(item.id); setBusca(''); }} className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-slate-50 ${FOCO}`}>
                    <strong className="truncate text-slate-900">{item.nome}</strong>
                    <span className="shrink-0 text-xs text-slate-500">{item.cargo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {empresasComGente.length > 1 && (
          <select aria-label="Empresa" value={empresaId} onChange={event => { setEmpresaId(event.target.value); setCaminho([]); }} className={`${CAMPO} cursor-pointer sm:w-56 max-sm:basis-full`}>
            <option value="">Empresa: todas</option>
            {empresasComGente.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        )}
        <button type="button" onClick={() => { if (folhaRef.current) imprimirEmUmaFolha(folhaRef.current, { orientacao: 'paisagem', titulo: 'Organograma' }); }} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`}>
          <Printer className="size-5" aria-hidden="true" />
          Imprimir
        </button>
      </div>

      {estrutura.topo.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <strong className="block text-slate-900">Ninguém tem líder no cadastro ainda</strong>
          <p className="mt-1 text-sm text-slate-600">Abra um colaborador, toque em Editar e escolha o Líder (a quem ele responde). O organograma se monta sozinho.</p>
        </div>
      ) : (
        <div ref={folhaRef} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
          <ol aria-label="Níveis do organograma" className="space-y-5">
            {linhas.map((linha, indice) => (
              <li key={indice} className="relative">
                {indice > 0 && (
                  <p className="mb-2 text-xs font-bold text-[#5b6870]">
                    Respondem a {porId.get(caminho[indice - 1])?.nome || ''} · {linha.length}
                  </p>
                )}
                <div className="flex gap-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                  {linha.map(pessoa => cartao(pessoa, indice))}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-slate-500 print:hidden">Toque numa pessoa para ver quem responde a ela. Toque de novo para abrir a ficha.</p>
        </div>
      )}

      {estrutura.semLider.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-3 print:hidden">
          <summary className={`cursor-pointer text-sm font-bold text-slate-700 ${FOCO}`}>
            {estrutura.semLider.length} {estrutura.semLider.length === 1 ? 'pessoa sem líder' : 'pessoas sem líder'} no cadastro
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {estrutura.semLider.map(pessoa => (
              <button key={pessoa.id} type="button" onClick={() => onAbrirPessoa(pessoa.id)} className={`rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-sm hover:border-emerald-300 ${FOCO}`}>
                <strong className="text-slate-900">{pessoa.nome}</strong>
                <span className="ml-1 text-xs text-slate-500">{pessoa.cargo}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

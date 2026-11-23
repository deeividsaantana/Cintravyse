import { useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import type { Cargo, Empresa, Funcionario } from '../../types';
import { isActiveCollaborator } from '../../masterData/centralRegistry';
import { NIVEIS, montarPiramide, type DegrauPiramide } from '../../utils/hierarquia';
import { BOTAO_SECUNDARIO, CAMPO, FOCO } from './estilos';
import { imprimirEmUmaFolha } from '../../utils/imprimirEmUmaFolha';
import { COR_DO_NIVEL } from './pessoasVisual';

interface Props {
  funcionarios: readonly Funcionario[];
  cargos: readonly Cargo[];
  empresas: readonly Empresa[];
  /** Leva para Cargos, onde se dá o nível aos cargos sem cadastro. */
  onIrParaCargos: () => void;
}

const porcento = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)}%` : '0%');

/**
 * Pirâmide de cargos: quantas pessoas ativas há em cada nível, do topo
 * (Diretoria) à base (Apoio). A largura de cada degrau é fixa, de cima para
 * baixo, para a forma ser sempre de pirâmide; o número é que diz o tamanho.
 * Tocar num degrau mostra de quais cargos ele é feito.
 */
export default function Piramide({ funcionarios, cargos, empresas, onIrParaCargos }: Props) {
  const folhaRef = useRef<HTMLDivElement>(null);
  const [empresaId, setEmpresaId] = useState('');
  const pessoas = useMemo(() => funcionarios.filter(item => !empresaId || item.empresaId === empresaId), [funcionarios, empresaId]);
  const degraus = useMemo(() => montarPiramide(pessoas, cargos), [pessoas, cargos]);
  const total = degraus.reduce((soma, item) => soma + item.pessoas, 0);
  const comGente = degraus.filter(item => item.nivel !== null && item.pessoas > 0);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const aberto: DegrauPiramide | undefined = degraus.find(item => item.nivel === escolhido)
    ?? comGente.reduce<DegrauPiramide | undefined>((maior, item) => (!maior || item.pessoas > maior.pessoas ? item : maior), undefined);
  const semNivel = degraus.find(item => item.nivel === null);
  const lideres = degraus.filter(item => item.nivel !== null && item.nivel <= 4).reduce((soma, item) => soma + item.pessoas, 0);
  const campo = degraus.filter(item => item.nivel !== null && item.nivel >= 5).reduce((soma, item) => soma + item.pessoas, 0);
  const empresasComGente = useMemo(() => {
    const ids = new Set(funcionarios.filter(isActiveCollaborator).map(item => item.empresaId));
    return empresas.filter(item => ids.has(item.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [funcionarios, empresas]);

  return (
    <div className="space-y-3" data-testid="piramide">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 print:hidden">
        {empresasComGente.length > 1 && (
          <select aria-label="Empresa" value={empresaId} onChange={event => setEmpresaId(event.target.value)} className={`${CAMPO} cursor-pointer sm:w-64 max-sm:basis-full`}>
            <option value="">Empresa: todas</option>
            {empresasComGente.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        )}
        <p className="text-sm text-slate-600 sm:mr-auto">
          <strong className="tabular-nums text-slate-900">{total.toLocaleString('pt-BR')}</strong> pessoas ativas
        </p>
        <button type="button" onClick={() => { if (folhaRef.current) imprimirEmUmaFolha(folhaRef.current, { orientacao: 'retrato', titulo: 'Pirâmide de cargos' }); }} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`}>
          <Printer className="size-5" aria-hidden="true" />
          Imprimir
        </button>
      </div>

      <div ref={folhaRef} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6">
          <ol aria-label="Pirâmide de cargos" className="mx-auto flex max-w-2xl flex-col items-center gap-1">
            {NIVEIS.map((nivel, indice) => {
              const degrau = degraus.find(item => item.nivel === nivel.nivel);
              const pessoasNoNivel = degrau?.pessoas || 0;
              const ativo = aberto?.nivel === nivel.nivel;
              const cor = COR_DO_NIVEL[indice];
              // Cada degrau é um trapézio: a base de cima tem a largura do degrau anterior.
              const largura = 46 + indice * 10.8;
              const recuo = `${((5.4 / largura) * 100).toFixed(2)}%`;
              return (
                <li key={nivel.nivel} className="flex w-full justify-center" style={{ filter: ativo ? 'drop-shadow(0 0 0.35rem rgba(242,106,46,0.55))' : undefined }}>
                  <button
                    type="button"
                    onClick={() => setEscolhido(nivel.nivel)}
                    aria-pressed={ativo}
                    data-testid="piramide-degrau"
                    style={{ width: `${largura}%`, background: cor.fundo, color: cor.letra, clipPath: `polygon(${recuo} 0, calc(100% - ${recuo}) 0, 100% 100%, 0 100%)` }}
                    className={`flex min-h-14 min-w-0 flex-col items-center justify-center px-6 text-center transition-[filter] duration-150 hover:brightness-110 focus-visible:brightness-125 ${FOCO}`}
                  >
                    <span className="text-xl font-black leading-tight tabular-nums">{pessoasNoNivel.toLocaleString('pt-BR')}</span>
                    <span className="max-w-full truncate text-xs font-bold">{nivel.nivel} · {nivel.nome}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {semNivel && semNivel.pessoas > 0 && (
            <button type="button" onClick={onIrParaCargos} className={`mt-4 w-full rounded-xl border border-dashed border-slate-300 p-3 text-left text-sm text-slate-600 hover:border-emerald-300 ${FOCO}`}>
              <strong className="text-slate-900">{semNivel.pessoas} {semNivel.pessoas === 1 ? 'pessoa' : 'pessoas'} sem nível</strong>
              {` porque ${semNivel.cargos.length === 1 ? 'o cargo' : `${semNivel.cargos.length} cargos`} ainda não ${semNivel.cargos.length === 1 ? 'está' : 'estão'} em Cargos. Toque para cadastrar.`}
            </button>
          )}
        </div>

        <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="piramide-detalhe">
          {aberto ? (
            <>
              <h3 className="text-lg font-black text-slate-900">{aberto.nivel} · {aberto.nome}</h3>
              <p className="text-sm text-slate-600">{aberto.pessoas.toLocaleString('pt-BR')} {aberto.pessoas === 1 ? 'pessoa' : 'pessoas'} · {porcento(aberto.pessoas, total)} do efetivo</p>
              {aberto.cargos.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {aberto.cargos.map(item => (
                    <li key={item.nome} className="text-sm">
                      <span className="flex justify-between gap-2">
                        <span className="min-w-0 truncate text-slate-700">{item.nome}</span>
                        <strong className="shrink-0 tabular-nums text-slate-900">{item.pessoas}</strong>
                      </span>
                      <span aria-hidden="true" className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full" style={{ width: porcento(item.pessoas, aberto.pessoas), background: aberto.nivel ? COR_DO_NIVEL[aberto.nivel - 1].fundo : COR_DO_NIVEL[6].fundo }} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">Ninguém neste nível.</p>}
            </>
          ) : <p className="text-sm text-slate-500">Nenhum colaborador ativo.</p>}
          {lideres > 0 && campo > 0 && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              1 pessoa de gestão ou liderança para cada <strong className="tabular-nums text-slate-900">{(campo / lideres).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> de campo.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

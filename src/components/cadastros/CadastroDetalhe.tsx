import { FileSpreadsheet, FileText, MapPin, Network, Pencil, RotateCcw, Trash2, UserMinus, Users } from 'lucide-react';
import React, { useMemo } from 'react';
import type { Cargo, Funcionario, GrupoEquipe, HistoryLog } from '../../types';
import { chaveDoCargo, equipePorPessoa, linhaDeComando, mapaDeCargos, montarEstrutura, nomeDoNivel } from '../../utils/hierarquia';
import { Avatar, SeloNivel } from './pessoasVisual';
import type { CadastroCategoriaId } from '../../utils/cadastrosCategorias';
import type { DadosCadastros, LinhaCadastro } from '../../utils/cadastrosLista';
import { temSituacao } from '../../utils/cadastrosLista';
import { CAMPOS, CLASSES_DA_TELA, type CampoCadastro } from './camposCadastro';
import CadastroPainel from './CadastroPainel';
import { BOTAO_PERIGO_LEVE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, TOM_SITUACAO } from './estilos';

export interface UsoCadastro {
  collection: string;
  count: number;
}

interface Props {
  categoria: CadastroCategoriaId;
  linha: LinhaCadastro;
  dados: DadosCadastros;
  usos: UsoCadastro[];
  historico: HistoryLog[];
  podeEditar: boolean;
  podeExcluir: boolean;
  onEditar: () => void;
  onInativar: () => void;
  onReativar: () => void;
  onExcluir: () => void;
  onFechar: () => void;
  /** Colaborador: abre o organograma já nele. */
  onVerNoOrganograma?: () => void;
}

const vazio = (valor: unknown) => valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0);

function Bloco({ titulo, children, testId }: { titulo: string; children: React.ReactNode; testId?: string }) {
  return (
    <section aria-label={titulo} data-testid={testId} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="mb-3 text-base font-bold text-slate-900">{titulo}</h3>
      {children}
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-slate-500">{rotulo}</dt>
      <dd className="break-words text-base font-semibold text-slate-900">{valor}</dd>
    </div>
  );
}

/**
 * Tudo sobre um cadastro sem sair da lista: os dados preenchidos, onde ele é
 * usado e quem mexeu por último. As ações ficam no rodapé, com Excluir por
 * último e em vermelho claro, para não ser tocado por engano.
 */
export default function CadastroDetalhe({ categoria, linha, dados, usos, historico, podeEditar, podeExcluir, onEditar, onInativar, onReativar, onExcluir, onFechar, onVerNoOrganograma }: Props) {
  const pessoa = categoria === 'funcionarios' ? linha.registro as Funcionario : null;
  // Lugar da pessoa na empresa: a quem responde, quem lidera e a equipe.
  const lugar = useMemo(() => {
    if (!pessoa) return null;
    const estrutura = montarEstrutura(dados.funcionarios, dados.cargos);
    return {
      linha: linhaDeComando(pessoa, estrutura),
      diretos: (estrutura.liderados.get(pessoa.id) || []).length,
      abaixo: estrutura.abaixo.get(pessoa.id) || 0,
      equipe: equipePorPessoa(dados.gruposEquipe).get(pessoa.id),
    };
  }, [pessoa, dados.funcionarios, dados.cargos, dados.gruposEquipe]);
  const cadastroDeCargos = useMemo(() => mapaDeCargos(dados.cargos), [dados.cargos]);
  const nivelDe = (cargo?: string) => cadastroDeCargos.get(chaveDoCargo(cargo))?.nivel ?? null;
  const registro = linha.registro as unknown as Record<string, unknown>;
  const nomes = new Map<string, string>([
    ...dados.empresas.map(item => [item.id, item.nome] as const),
    ...dados.obras.map(item => [item.id, item.nome] as const),
    ...dados.funcionarios.map(item => [item.id, item.nome] as const),
    ...dados.combustiveis.map(item => [item.id, item.nome] as const),
    ...dados.equipamentos.map(item => [item.id, `${item.prefixo} · ${item.nome}`] as const),
  ]);

  const exibir = (campo: CampoCadastro, valor: unknown): string => {
    const { tipo } = campo;
    if (tipo === 'classes') {
      return (valor as string[]).map(tipo => CLASSES_DA_TELA.find(classe => classe.tipo === tipo)?.label || tipo).join(', ');
    }
    if (tipo === 'marcar') return valor ? 'Sim' : 'Não';
    if (tipo === 'pessoas') return `${(valor as string[]).length} pessoas: ${(valor as string[]).map(id => nomes.get(id)).filter(Boolean).join(', ')}`;
    if (campo.id === 'nivel' && categoria === 'cargos') return nomeDoNivel((linha.registro as Cargo).nivel);
    if (tipo === 'data' && typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const [ano, mes, dia] = valor.slice(0, 10).split('-');
      return `${dia}/${mes}/${ano}`;
    }
    if (tipo === 'selecao' && typeof valor === 'string') {
      return campo.opcoes?.(dados, null).find(opcao => opcao.valor === valor)?.label || nomes.get(valor) || valor;
    }
    return String(valor);
  };

  const linhas = CAMPOS[categoria]
    .filter(campo => campo.tipo !== 'foto')
    .map(campo => {
      const valor = campo.id === 'liderId' ? registro.liderNome
        : campo.id === 'encarregadoId' ? (linha.registro as GrupoEquipe).responsavel
          : registro[campo.id];
      return { campo, valor };
    })
    .filter(({ valor }) => !vazio(valor));
  const foto = typeof registro.foto === 'string' ? registro.foto : '';
  const podeInativar = temSituacao(categoria);
  const usado = usos.length > 0;

  const rodapeTelaCheia = podeEditar ? (
    <div className="flex flex-wrap justify-end gap-2">
      {podeExcluir && (
        <button type="button" onClick={onExcluir} className={`${BOTAO_PERIGO_LEVE} max-sm:flex-1 sm:mr-auto`} data-testid="cadastro-excluir">
          <Trash2 className="size-5" aria-hidden="true" />
          Excluir
        </button>
      )}
      {linha.ativo ? (
        <button type="button" onClick={onInativar} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`} data-testid="cadastro-inativar">
          <UserMinus className="size-5" aria-hidden="true" />
          Inativar
        </button>
      ) : (
        <button type="button" onClick={onReativar} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`}>
          <RotateCcw className="size-5" aria-hidden="true" />
          Reativar
        </button>
      )}
      <button type="button" onClick={onEditar} className={`${BOTAO_PRIMARIO} px-6 max-sm:basis-full`} data-testid="cadastro-editar">
        <Pencil className="size-5" aria-hidden="true" />
        Editar
      </button>
    </div>
  ) : undefined;

  if (categoria === 'equipes') {
    const equipe = linha.registro as GrupoEquipe;
    const porId = new Map(dados.funcionarios.map(item => [item.id, item]));
    const membros = equipe.funcionarioIds.map(id => porId.get(id)).filter((item): item is Funcionario => Boolean(item))
      .sort((a, b) => (nivelDe(a.cargo) ?? 9) - (nivelDe(b.cargo) ?? 9) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const encarregado = equipe.liderMatricula ? dados.funcionarios.find(item => item.matricula === equipe.liderMatricula) : undefined;
    const baixarEquipe = async (formato: 'excel' | 'pdf') => {
      const { baixarExcelPessoas, baixarPdfPessoas } = await import('../../utils/exportarPessoas');
      const lista = {
        titulo: equipe.nome,
        subtitulo: [equipe.frenteServico, equipe.responsavel && `Encarregado: ${equipe.responsavel}`].filter(Boolean).join(' · '),
        pessoas: membros.map(item => ({
          nome: item.nome,
          matricula: item.matricula || '',
          cargo: item.cargo || '',
          equipe: equipe.nome,
          lider: item.liderNome || '',
          situacao: (() => { const st = (item.status || (item.ativo === false ? 'INATIVO' : 'ATIVO')).toLowerCase(); return st.charAt(0).toUpperCase() + st.slice(1); })(),
        })),
      };
      await (formato === 'excel' ? baixarExcelPessoas(lista) : baixarPdfPessoas(lista));
    };
    return (
      <CadastroPainel telaCheia titulo={equipe.nome} onFechar={onFechar} testId="cadastro-detalhe" rodape={rodapeTelaCheia}>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6" data-testid="equipe-topo">
            <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0f5a3d]"><Users className="size-7" /></span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-words text-2xl font-black leading-tight text-slate-900">{equipe.nome}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${TOM_SITUACAO[linha.tom]}`}>{linha.situacao}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-slate-500" aria-hidden="true" />{equipe.frenteServico || 'Sem frente de serviço'}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:w-64">
              <div className="flex flex-col-reverse rounded-2xl border border-slate-200 bg-white p-3 text-center">
                <dt className="text-sm text-slate-600">Pessoas</dt>
                <dd className="text-2xl font-black tabular-nums text-slate-900">{membros.length}</dd>
              </div>
              <div className="flex flex-col-reverse rounded-2xl border border-slate-200 bg-white p-3 text-center">
                <dt className="text-sm text-slate-600">Link de presença</dt>
                <dd className={`text-base font-black ${equipe.linkAtivo ? 'text-[#0f5a3d]' : 'text-slate-600'}`}>{equipe.linkAtivo ? 'Ligado' : 'Desligado'}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Bloco titulo="Encarregado" testId="equipe-encarregado">
              <div className="flex items-center gap-3">
                <Avatar nome={equipe.responsavel || '?'} nivel={nivelDe(encarregado?.cargo)} tamanho="g" />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{equipe.responsavel || 'Sem encarregado'}</p>
                  <p className="truncate text-sm text-slate-600">{encarregado?.cargo || 'Cargo não informado'}</p>
                  {encarregado?.telefone && <p className="text-sm text-slate-600">{encarregado.telefone}</p>}
                </div>
              </div>
            </Bloco>

            <div className="lg:col-span-2">
              <Bloco titulo={`Quem faz parte (${membros.length})`} testId="equipe-membros">
                {membros.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void baixarEquipe('excel')} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`} data-testid="equipe-ficha-excel">
                      <FileSpreadsheet className="size-5" aria-hidden="true" />
                      Baixar Excel
                    </button>
                    <button type="button" onClick={() => void baixarEquipe('pdf')} className={`${BOTAO_SECUNDARIO} max-sm:flex-1`} data-testid="equipe-ficha-pdf">
                      <FileText className="size-5" aria-hidden="true" />
                      Baixar PDF
                    </button>
                  </div>
                )}
                {membros.length === 0 ? <p className="text-sm text-slate-600">Ninguém na equipe ainda. Toque em Editar para escolher as pessoas.</p> : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {membros.map(item => (
                      <li key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
                        <Avatar nome={item.nome} nivel={nivelDe(item.cargo)} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{item.nome}</span>
                          <span className="block truncate text-xs text-slate-500">{[item.cargo, item.matricula && `Matrícula ${item.matricula}`].filter(Boolean).join(' · ')}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Bloco>
            </div>
          </div>
        </div>
      </CadastroPainel>
    );
  }

  if (lugar && pessoa) {
    const nivel = nivelDe(pessoa.cargo);
    // Nome, matrícula e situação já estão no topo: não se repetem aqui.
    const pessoais = linhas.filter(({ campo }) => !['cargo', 'liderId', 'nome', 'matricula', 'status'].includes(campo.id));
    return (
      <CadastroPainel
        telaCheia
        titulo={linha.titulo}
        onFechar={onFechar}
        testId="cadastro-detalhe"
        rodape={rodapeTelaCheia}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6" data-testid="cadastro-pessoa-topo">
            <Avatar nome={pessoa.nome} nivel={nivel} tamanho="g" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-words text-2xl font-black leading-tight text-slate-900">{pessoa.nome}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${TOM_SITUACAO[linha.tom]}`}>{linha.situacao}</span>
                <SeloNivel nivel={nivel} />
                <span className="text-sm text-slate-600">{pessoa.matricula ? `Matrícula ${pessoa.matricula}` : 'Sem matrícula'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Bloco titulo="Dados pessoais" testId="ficha-dados">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {pessoais.map(({ campo, valor }) => <Dado key={campo.id} rotulo={campo.label} valor={exibir(campo, valor)} />)}
              </dl>
            </Bloco>

            <Bloco titulo="Cargo e equipe" testId="ficha-cargo">
              <dl className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Dado rotulo="Cargo" valor={pessoa.cargo || 'Sem cargo'} /></div>
                <div className="col-span-2"><Dado rotulo="Equipe" valor={lugar.equipe?.nome || 'Nenhuma'} /></div>
                <div className="flex flex-col-reverse rounded-2xl border border-slate-200 bg-white p-3">
                  <dt className="text-sm text-slate-600">Lidera direto</dt>
                  <dd className="text-2xl font-black tabular-nums text-slate-900">{lugar.diretos}</dd>
                </div>
                <div className="flex flex-col-reverse rounded-2xl border border-slate-200 bg-white p-3">
                  <dt className="text-sm text-slate-600">Total abaixo</dt>
                  <dd className="text-2xl font-black tabular-nums text-slate-900">{lugar.abaixo}</dd>
                </div>
              </dl>
            </Bloco>

            <Bloco titulo="Linha de comando" testId="cadastro-lugar">
              <ol aria-label="Linha de comando" className="space-y-2">
                {lugar.linha.map((item, indice) => {
                  const eu = item.id === pessoa.id;
                  return (
                    <li key={item.id} className="relative flex items-center gap-3">
                      {indice < lugar.linha.length - 1 && <span aria-hidden="true" className="absolute left-[1.125rem] top-9 h-3 w-0.5 bg-slate-300" />}
                      <Avatar nome={item.nome} nivel={nivelDe(item.cargo)} />
                      <span className={`min-w-0 flex-1 rounded-xl border px-3 py-1.5 ${eu ? 'border-[#176b4d] bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
                        <span className={`block truncate text-sm ${eu ? 'font-bold text-[#0f5a3d]' : 'font-semibold text-slate-900'}`}>{eu ? `${item.nome} (esta pessoa)` : item.nome}</span>
                        <span className="block truncate text-xs text-slate-500">{item.cargo || 'Sem cargo'}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {lugar.linha.length === 1 && <p className="mt-2 text-sm text-slate-600">Não responde a ninguém do cadastro.</p>}
              {onVerNoOrganograma && (
                <button type="button" onClick={onVerNoOrganograma} className={`${BOTAO_SECUNDARIO} mt-3 w-full`} data-testid="cadastro-ver-organograma">
                  <Network className="size-5" aria-hidden="true" />
                  Ver no organograma
                </button>
              )}
            </Bloco>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Bloco titulo="Onde aparece">
              {usado ? (
                <ul className="space-y-1.5">
                  {usos.map(uso => (
                    <li key={uso.collection} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                      <span className="text-slate-700">{uso.collection}</span>
                      <strong className="tabular-nums text-slate-900">{uso.count.toLocaleString('pt-BR')}</strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-600">Não aparece em nenhum lançamento.</p>}
            </Bloco>
            <Bloco titulo="Últimas alterações">
              {historico.length > 0 ? (
                <ol className="space-y-2.5">
                  {historico.map(log => (
                    <li key={log.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-sm">
                      <span className="text-xs tabular-nums text-slate-500">{log.timestamp.slice(0, 16)}</span>
                      <span className="text-slate-700"><strong className="font-semibold text-slate-900">{log.usuario}</strong> {log.acao.toLowerCase()}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-slate-600">Nenhuma alteração registrada neste aparelho.</p>}
            </Bloco>
          </div>
        </div>
      </CadastroPainel>
    );
  }

  return (
    <CadastroPainel
      titulo={linha.titulo}
      subtitulo={linha.detalhe}
      topo={<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${TOM_SITUACAO[linha.tom]}`}>{linha.situacao}</span>}
      onFechar={onFechar}
      testId="cadastro-detalhe"
      rodape={podeEditar ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onEditar} className={`${BOTAO_PRIMARIO} sm:col-span-3`} data-testid="cadastro-editar">
            <Pencil className="size-5" aria-hidden="true" />
            Editar
          </button>
          {podeInativar && (linha.ativo ? (
            <button type="button" onClick={onInativar} className={`${BOTAO_SECUNDARIO} ${podeExcluir ? 'sm:col-span-2' : 'sm:col-span-3'}`} data-testid="cadastro-inativar">
              <UserMinus className="size-5" aria-hidden="true" />
              Inativar
            </button>
          ) : (
            <button type="button" onClick={onReativar} className={`${BOTAO_SECUNDARIO} ${podeExcluir ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
              <RotateCcw className="size-5" aria-hidden="true" />
              Reativar
            </button>
          ))}
          {podeExcluir && (
            <button type="button" onClick={onExcluir} className={`${BOTAO_PERIGO_LEVE} ${podeInativar ? '' : 'sm:col-span-3'}`} data-testid="cadastro-excluir">
              <Trash2 className="size-5" aria-hidden="true" />
              Excluir
            </button>
          )}
        </div>
      ) : undefined}
    >
      <div className="space-y-6">
        {foto && <img src={foto} alt={`Foto de ${linha.titulo}`} className="aspect-video w-full rounded-2xl border border-slate-200 object-cover" />}

        <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
          {linhas.map(({ campo, valor }) => (
            <div key={campo.id} className="contents">
              <dt className="text-slate-500">{campo.label}</dt>
              <dd className="break-words font-medium text-slate-900">{exibir(campo, valor)}</dd>
            </div>
          ))}
          <dt className="text-slate-500">Código</dt>
          <dd className="break-all font-mono text-xs text-slate-500 tabular-nums">{linha.id}</dd>
        </dl>

        <section aria-labelledby="cadastro-usos-titulo" className="space-y-2">
          <h3 id="cadastro-usos-titulo" className="text-xs font-bold text-[#5b6870]">Onde é usado</h3>
          {usado ? (
            <ul className="space-y-1.5">
              {usos.map(uso => (
                <li key={uso.collection} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <span className="text-slate-700">{uso.collection}</span>
                  <strong className="tabular-nums text-slate-900">{uso.count.toLocaleString('pt-BR')}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">Não aparece em nenhum lançamento.</p>
          )}
        </section>

        <section aria-labelledby="cadastro-historico-titulo" className="space-y-2">
          <h3 id="cadastro-historico-titulo" className="text-xs font-bold text-[#5b6870]">Últimas alterações</h3>
          {historico.length > 0 ? (
            <ol className="space-y-2.5">
              {historico.map(log => (
                <li key={log.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <span className="text-xs tabular-nums text-slate-500">{log.timestamp.slice(0, 16)}</span>
                  <span className="text-slate-700"><strong className="font-semibold text-slate-900">{log.usuario}</strong> {log.acao.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma alteração registrada neste aparelho.</p>
          )}
        </section>
      </div>
    </CadastroPainel>
  );
}

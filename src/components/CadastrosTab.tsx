/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, Download, FileSpreadsheet, FileText, MoreVertical, Plus, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import type {
  Canteiro,
  Cargo,
  Comboio,
  Empresa,
  Equipamento,
  EtapaServico,
  FrenteServico,
  ServicoObra,
  Funcionario,
  HistoryLog,
  ObraLocal,
  ProdutoLubrificacao,
  TipoCombustivel,
  GrupoEquipe,
} from '../types';
import { validateCentralRecord } from '../masterData/centralRegistry';
import { exclusoesAtivas, type ExclusaoRegistro } from '../cloud/exclusoes';
import SpreadsheetImportReview from './SpreadsheetImportReview';
import { FilterBar, Modal, PageHeader } from '../shared/ui';
import { AbasDaTela, idDaAba } from '../shared/ui/AbasDaTela';
import { TelaCheia } from '../shared/ui/TelaCheia';
import { useEntradaDeLista } from '../shared/hooks/useEntradaDeLista';
import { abaSugerida, type AbaPlanilha } from '../utils/planilhaAbas';
import { CADASTRO_CATEGORIAS, categoriaCadastro, type CadastroCategoriaId } from '../utils/cadastrosCategorias';
import {
  COLUNAS,
  FILTROS,
  TABELA_DA_CATEGORIA,
  contarSituacoes,
  filtrarLinhas,
  montarLinhas,
  opcoesDoFiltro,
  ordenarLinhas,
  temSituacao,
  type DadosCadastros,
  type LinhaCadastro,
  type RegistroCadastro,
  type SituacaoLista,
} from '../utils/cadastrosLista';
import { abasCadastros, ehVistaEstrutura, type VistaCadastros } from './cadastros/abasCadastros';
import Organograma from './cadastros/Organograma';
import Piramide from './cadastros/Piramide';
import { ResumoColaboradores } from './cadastros/pessoasVisual';
import { cargosQueFaltam, novosCargos } from '../utils/hierarquia';
import CadastroLista from './cadastros/CadastroLista';
import SincronizarEquipesPlanilha, { type SincronizarEquipesRef } from './cadastros/SincronizarEquipesPlanilha';
import EquipesCartoes from './cadastros/EquipesCartoes';
import CadastroDetalhe, { type UsoCadastro } from './cadastros/CadastroDetalhe';
import CadastroFormulario from './cadastros/CadastroFormulario';
import CadastroConfirmacao, { type AcaoConfirmacao } from './cadastros/CadastroConfirmacao';
import CadastroLixeira from './cadastros/CadastroLixeira';
import CadastroConfirmacaoLote, { type ItemTravado } from './cadastros/CadastroConfirmacaoLote';
import { montarRegistro, novoId, valoresIniciais, type ValoresCadastro } from './cadastros/camposCadastro';
import type { TeamSyncPlan } from '../utils/teamSpreadsheetSync';
import { parseWorkbookFile } from './cadastros/lerPlanilhaCadastros';
import { BOTAO_PERIGO, BOTAO_PERIGO_LEVE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, FOCO } from './cadastros/estilos';
import './cadastros/Cadastros.css';

type ResultadoExclusao = { ok: true; exclusaoId: string } | { ok: false; usos: UsoCadastro[]; mensagem?: string };

interface CadastrosTabProps {
  empresas: Empresa[];
  obras: ObraLocal[];
  equipamentos: Equipamento[];
  funcionarios: Funcionario[];
  comboios: Comboio[];
  combustiveis: TipoCombustivel[];
  lubrificantes: ProdutoLubrificacao[];
  canteiros: Canteiro[];
  etapas: EtapaServico[];
  frentesServico: FrenteServico[];
  servicosObra: ServicoObra[];
  cargos: Cargo[];
  historyLogs: HistoryLog[];
  exclusoes: ExclusaoRegistro[];
  podeEditar: boolean;
  podeExcluir: boolean;
  /** Maior que zero: abre direto o formulário de colaborador novo (botão de Colaboradores). */
  pedidoNovoColaborador?: number;
  /** Maior que zero: abre direto a vista Equipes (link "Gerenciar equipes" da Presença). */
  pedidoEquipes?: number;
  gruposEquipe?: GrupoEquipe[];
  onSaveGrupoEquipe?: (grupo: GrupoEquipe, isNew: boolean) => void;
  /** Grava a sincronização das equipes pela planilha "Efetivo", já conferida na tela. */
  onSyncEquipesPlanilha?: (
    funcionarios: Funcionario[],
    gruposEquipe: GrupoEquipe[],
    resumo: TeamSyncPlan['resumo'],
  ) => Promise<{ success: boolean; message: string }>;

  onSaveEmpresa: (item: Empresa, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveObra: (item: ObraLocal, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveEquipamento: (item: Equipamento, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveFuncionario: (item: Funcionario, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveComboio: (item: Comboio, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveTipoCombustivel: (item: TipoCombustivel, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveProdutoLubrificacao: (item: ProdutoLubrificacao, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveCanteiro: (item: Canteiro, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveEtapaServico: (item: EtapaServico, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveFrente: (item: FrenteServico, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveServico: (item: ServicoObra, isNew: boolean, onError?: (error: Error) => void) => void;
  onSaveCargo: (item: Cargo, isNew: boolean, onError?: (error: Error) => void) => void;
  /** Cadastra de uma vez os cargos que as pessoas já usam. */
  onSaveCargos: (itens: Cargo[]) => void;
  /** Inativa empresa, colaborador ou equipamento, mantendo o histórico. */
  onInativar: (tabela: string, id: string) => void;
  usosDoCadastro: (tabela: string, id: string) => UsoCadastro[];
  onExcluir: (tabela: string, id: string, rotulo: string) => ResultadoExclusao;
  onRestaurar: (exclusaoId: string) => { ok: boolean; mensagem: string };
  onExcluirVarios: (tabela: string, alvos: Array<{ id: string; rotulo: string }>) => {
    excluidos: Array<{ id: string; rotulo: string; exclusaoId: string }>;
    travados: Array<{ id: string; rotulo: string; usos: UsoCadastro[] }>;
    mensagem?: string;
  };
  onRestaurarVarios: (exclusaoIds: string[]) => { ok: boolean; mensagem: string };
  onApagarDeVez: (exclusaoIds: string[]) => { ok: boolean; mensagem: string };
  onImportCadastros: (target: CadastroCategoriaId, rows: Record<string, string>[]) => { success: boolean; message: string };
}

interface Aviso {
  tipo: 'ok' | 'erro';
  texto: string;
  desfazer?: () => void;
  tom?: 'erro' | 'aviso';
}

/**
 * 22/11/2026: sem aviso flutuante na tela (o Deivid pediu para tirar todas as
 * notificações). O que deu errado vai só para o console; a lista já mostra o
 * resultado de cada ação.
 */
const setAviso = (aviso: Aviso | null) => {
  if (aviso?.tipo === 'erro') console.warn(`[Cadastros] ${aviso.texto}`);
};

export default function CadastrosTab(props: CadastrosTabProps) {
  const {
    empresas, obras, equipamentos, funcionarios, comboios, combustiveis, lubrificantes, canteiros, etapas, frentesServico, servicosObra, cargos,
    historyLogs, exclusoes, podeEditar, podeExcluir,
    onInativar, usosDoCadastro, onExcluir, onRestaurar, onApagarDeVez, onImportCadastros,
  } = props;

  const gruposEquipe = useMemo(() => props.gruposEquipe, [props.gruposEquipe]);
  const dados: DadosCadastros = useMemo(
    () => ({ empresas, obras, equipamentos, funcionarios, comboios, combustiveis, lubrificantes, canteiros, etapas, frentesServico, servicosObra, cargos, gruposEquipe }),
    [empresas, obras, equipamentos, funcionarios, comboios, combustiveis, lubrificantes, canteiros, etapas, frentesServico, servicosObra, cargos, gruposEquipe],
  );

  // O tipo escolhido fica guardado mesmo com a Lixeira aberta: é ele que o
  // botão principal e a importação usam.
  const [categoria, setCategoria] = useState<CadastroCategoriaId>('funcionarios');
  const [vista, setVista] = useState<VistaCadastros>('funcionarios');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoLista>('ativos');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [acoesAbertas, setAcoesAbertas] = useState(false);
  const sincronizarRef = useRef<SincronizarEquipesRef>(null);
  const [ordem, setOrdem] = useState<{ coluna: string; direcao: 'asc' | 'desc' }>({ coluna: COLUNAS.funcionarios[0].id, direcao: 'asc' });
  const [pagina, setPagina] = useState(1);
  // Pessoa que o organograma abre já escolhida ("Ver no organograma" da ficha).
  const [focoOrganograma, setFocoOrganograma] = useState<string | null>(null);

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<{ editandoId: string | null; valores: ValoresCadastro } | null>(null);
  const [erroFormulario, setErroFormulario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ acao: AcaoConfirmacao; linha: LinhaCadastro; usos: UsoCadastro[] } | null>(null);
  const [processando, setProcessando] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  // Itens da Lixeira esperando a confirmação de excluir de vez (um ou todos).
  const [apagando, setApagando] = useState<ExclusaoRegistro[] | null>(null);
  // Marcados para excluir em lote. Valem só para o tipo aberto.
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(() => new Set());
  const [lote, setLote] = useState<{ livres: LinhaCadastro[]; travados: ItemTravado[] } | null>(null);
  const [exportando, setExportando] = useState(false);

  const arquivoRef = useRef<HTMLInputElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const [importacao, setImportacao] = useState<{ fileName: string; rows: Record<string, string>[] } | null>(null);
  const [escolhaDeAba, setEscolhaDeAba] = useState<{ fileName: string; abas: AbaPlanilha[]; sugerida: string | null; ocultas: number } | null>(null);
  const [confirmandoImportacao, setConfirmandoImportacao] = useState(false);

  const categoriaAtual = categoriaCadastro(categoria);
  const tabela = TABELA_DA_CATEGORIA[categoria];
  const comSituacao = temSituacao(categoria);
  // Frentes e serviços ainda não têm leitura de planilha: o botão não aparece
  // para não cair na importação de outro tipo.
  const importaPlanilha = !['frentes', 'servicos', 'canteiros', 'cargos', 'equipes'].includes(categoria);
  const faltamCargos = useMemo(() => (categoria === 'cargos' ? cargosQueFaltam(funcionarios, cargos) : []), [categoria, funcionarios, cargos]);

  const todasAsLinhas = useMemo(() => montarLinhas(categoria, dados), [categoria, dados]);
  const contagem = useMemo(() => contarSituacoes(todasAsLinhas), [todasAsLinhas]);
  const linhasFiltradas = useMemo(() => {
    const filtradas = filtrarLinhas(todasAsLinhas, { busca, situacao: comSituacao ? situacao : 'todos', filtros });
    return ordenarLinhas(filtradas, ordem.coluna, ordem.direcao);
  }, [todasAsLinhas, busca, situacao, comSituacao, filtros, ordem]);

  const lixeira = useMemo(
    () => Array.from(exclusoesAtivas(exclusoes).values()).filter(item => !item.apagadoEm).sort((a, b) => b.excluidoEm.localeCompare(a.excluidoEm)),
    [exclusoes],
  );

  const totais = useMemo(() => {
    const mapa = new Map<VistaCadastros, number>();
    CADASTRO_CATEGORIAS.forEach(item => mapa.set(item.id, montarLinhas(item.id, dados).filter(linha => linha.ativo).length));
    mapa.set('lixeira', lixeira.length);
    return mapa;
  }, [dados, lixeira.length]);

  const linhaDetalhe = detalheId ? todasAsLinhas.find(linha => linha.id === detalheId) : undefined;
  const usosDetalhe = useMemo(() => (linhaDetalhe ? usosDoCadastro(tabela, linhaDetalhe.id) : []), [linhaDetalhe, usosDoCadastro, tabela]);
  const historicoDetalhe = useMemo(
    () => (linhaDetalhe ? historyLogs.filter(log => log.registroId === linhaDetalhe.id).slice(0, 6) : []),
    [historyLogs, linhaDetalhe],
  );

  // Busca, filtro ou troca de tipo mudam o total de páginas: volta para a primeira.
  useEffect(() => setPagina(1), [categoria, busca, situacao, filtros, ordem]);

  const escopo = useEntradaDeLista<HTMLElement>([vista, pagina, busca, situacao, filtros]);

  // Entrada do cabeçalho, das abas e da barra de filtros, no passo do Painel.
  useGSAP(() => {
    const raiz = escopo.current;
    if (!raiz || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(raiz.querySelectorAll('[data-cadastros-reveal]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
  }, { scope: escopo });

  const escolherVista = (proxima: VistaCadastros) => {
    setVista(proxima);
    setDetalheId(null);
    setMarcados(new Set());
    setAcoesAbertas(false);
    if (proxima !== 'organograma') setFocoOrganograma(null);
    if (proxima === 'lixeira' || ehVistaEstrutura(proxima)) return;
    setCategoria(proxima);
    setBusca('');
    setFiltros({});
    setSituacao('ativos');
    setOrdem({ coluna: COLUNAS[proxima][0].id, direcao: 'asc' });
  };

  const ordenar = (coluna: string) => setOrdem(atual => (
    atual.coluna === coluna ? { coluna, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' } : { coluna, direcao: 'asc' }
  ));

  const limparFiltros = () => {
    setBusca('');
    setFiltros({});
    setSituacao('ativos');
  };

  // ---- Gravar -------------------------------------------------------------

  // O Desfazer roda segundos depois. Ele usa as funções do App da última
  // renderização: as de antes ainda enxergam a lista sem a exclusão.
  const ultimas = useRef(props);
  ultimas.current = props;

  const gravar = (registro: RegistroCadastro, novo: boolean, onError?: (error: Error) => void, tabela = TABELA_DA_CATEGORIA[categoria]) => {
    const props = ultimas.current;
    if (tabela === 'empresas') props.onSaveEmpresa(registro as Empresa, novo, onError);
    else if (tabela === 'funcionarios') props.onSaveFuncionario(registro as Funcionario, novo, onError);
    else if (tabela === 'equipamentos') props.onSaveEquipamento(registro as Equipamento, novo, onError);
    else if (tabela === 'obras') props.onSaveObra(registro as ObraLocal, novo, onError);
    else if (tabela === 'comboios') props.onSaveComboio(registro as Comboio, novo, onError);
    else if (tabela === 'combustiveis') props.onSaveTipoCombustivel(registro as TipoCombustivel, novo, onError);
    else if (tabela === 'lubrificantes') props.onSaveProdutoLubrificacao(registro as ProdutoLubrificacao, novo, onError);
    else if (tabela === 'canteiros') props.onSaveCanteiro(registro as Canteiro, novo, onError);
    else if (tabela === 'frentesServico') props.onSaveFrente(registro as FrenteServico, novo, onError);
    else if (tabela === 'servicosObra') props.onSaveServico(registro as ServicoObra, novo, onError);
    else if (tabela === 'cargos') props.onSaveCargo(registro as Cargo, novo, onError);
    else if (tabela === 'gruposEquipe') props.onSaveGrupoEquipe?.(registro as GrupoEquipe, novo);
    else props.onSaveEtapaServico(registro as EtapaServico, novo, onError);
  };

  const abrirNovo = () => {
    if (vista === 'lixeira' || ehVistaEstrutura(vista)) setVista(categoria);
    setErroFormulario('');
    setDetalheId(null);
    setFormulario({ editandoId: null, valores: valoresIniciais(categoria, undefined, dados) });
  };

  // "Cadastrar colaborador" na aba Colaboradores chega aqui já com o
  // formulário aberto, em vez de deixar a pessoa procurando o botão.
  const pedidoNovo = props.pedidoNovoColaborador ?? 0;
  useEffect(() => {
    if (!pedidoNovo || !podeEditar) return;
    setVista('funcionarios');
    setCategoria('funcionarios');
    setDetalheId(null);
    setErroFormulario('');
    setFormulario({ editandoId: null, valores: valoresIniciais('funcionarios', undefined, dados) });
    // Só o pedido abre o formulário; dados novos não podem reabri-lo.
  }, [pedidoNovo]);

  const pedidoEquipes = props.pedidoEquipes ?? 0;
  useEffect(() => {
    if (!pedidoEquipes) return;
    escolherVista('equipes');
    // Só o pedido muda a vista; dados novos não podem tirar a pessoa de onde está.
  }, [pedidoEquipes]);

  const abrirEdicao = (linha: LinhaCadastro) => {
    setErroFormulario('');
    setDetalheId(null);
    setFormulario({ editandoId: linha.id, valores: valoresIniciais(categoria, linha.registro, dados) });
  };

  // Sem nenhuma janela aberta: N cadastra, / vai direto pra busca. É a mesma
  // ideia já usada em Manutenção e Combustível — só falta aqui.
  const semJanelaAberta = !formulario && !confirmacao && !lote && !apagando && !escolhaDeAba && !importacao;
  useEffect(() => {
    if (!semJanelaAberta) return undefined;
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key.toLowerCase() === 'n' && !isTyping && podeEditar) {
        event.preventDefault();
        abrirNovo();
        return;
      }
      if (event.key === '/' && !isTyping && vista !== 'lixeira' && !ehVistaEstrutura(vista)) {
        event.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [semJanelaAberta, podeEditar, vista]);

  const salvarFormulario = (valores: ValoresCadastro) => {
    if (!formulario) return;
    const anterior = formulario.editandoId ? todasAsLinhas.find(linha => linha.id === formulario.editandoId)?.registro : undefined;
    const id = formulario.editandoId || novoId(categoria, dados);
    const montado = montarRegistro(categoria, valores, anterior, id, dados);
    if (montado.ok === false) {
      setErroFormulario(montado.erro);
      return;
    }
    // Mesma checagem do App (matrícula, prefixo, CNPJ e nome repetidos), feita
    // aqui para o erro aparecer no formulário em vez de só no sino.
    if (['empresas', 'funcionarios', 'equipamentos', 'obras'].includes(tabela)) {
      const erros = validateCentralRecord({ empresas, equipamentos, funcionarios, obras, record: montado.registro as Empresa });
      if (erros.length > 0) {
        setErroFormulario(erros.join(' '));
        return;
      }
    }
    setSalvando(true);
    const novo = !formulario.editandoId;
    let falhou = false;
    gravar(montado.registro, novo, error => {
      falhou = true;
      // A gravação local já aconteceu, mas a edição volta para a tela com os
      // valores preservados para que a pessoa possa reenviar sem redigitar.
      setSalvando(false);
      setFormulario({ editandoId: formulario.editandoId, valores });
      setErroFormulario(`Salvo neste aparelho, mas não chegou à nuvem. Tente novamente: ${error.message}`);
      setAviso({ tipo: 'erro', tom: 'aviso', texto: 'O cadastro foi preservado neste aparelho e ficou aguardando reenvio.' });
    });
    setSalvando(false);
    if (falhou) return;
    setFormulario(null);
    setDetalheId(id);
    setAviso({ tipo: 'ok', texto: novo ? `${montado.registro && 'nome' in montado.registro ? montado.registro.nome : 'Cadastro'} cadastrado.` : 'Alterações salvas.' });
  };

  // ---- Inativar, reativar, excluir e restaurar ---------------------------

  const registroComSituacao = (linha: LinhaCadastro, ativo: boolean): RegistroCadastro => {
    const registro = linha.registro;
    if (tabela === 'empresas') return { ...(registro as Empresa), status: ativo ? 'ATIVO' : 'INATIVO', atualizadoEm: new Date().toISOString() };
    if (tabela === 'funcionarios') return { ...(registro as Funcionario), status: ativo ? 'ATIVO' : 'DESMOBILIZADO', ativo };
    if (tabela === 'equipamentos') return { ...(registro as Equipamento), status: ativo ? 'Ativo' : 'Desmobilizado', mobilizado: ativo ? (registro as Equipamento).mobilizado : false };
    if (tabela === 'frentesServico') {
      const frente = registro as FrenteServico;
      return { ...frente, ativo, situacao: ativo && frente.situacao === 'Concluída' ? 'Em execução' : frente.situacao, atualizadoEm: new Date().toISOString() };
    }
    if (tabela === 'servicosObra') {
      const servico = registro as ServicoObra;
      return { ...servico, ativo, situacao: ativo && servico.situacao === 'Concluído' ? 'Ativo' : servico.situacao, atualizadoEm: new Date().toISOString() };
    }
    if (tabela === 'cargos') return { ...(registro as Cargo), ativo, atualizadoEm: new Date().toISOString() };
    if (tabela === 'gruposEquipe') return { ...(registro as GrupoEquipe), status: ativo ? 'ativo' : 'inativo', updatedAt: new Date().toISOString() };
    return { ...(registro as ObraLocal), status: ativo ? 'Ativa' : 'Concluída' };
  };

  const inativar = (linha: LinhaCadastro) => {
    if (['obras', 'frentesServico', 'servicosObra', 'cargos', 'gruposEquipe'].includes(tabela)) gravar(registroComSituacao(linha, false), false);
    else onInativar(tabela, linha.id);
    const original = linha.registro;
    const tabelaDoRegistro = tabela;
    setConfirmacao(null);
    setDetalheId(null);
    setAviso({ tipo: 'ok', texto: `${linha.titulo} inativado.`, desfazer: () => { gravar(original, false, undefined, tabelaDoRegistro); setAviso({ tipo: 'ok', texto: `${linha.titulo} voltou a ficar ativo.` }); } });
  };

  const reativar = (linha: LinhaCadastro) => {
    gravar(registroComSituacao(linha, true), false);
    setAviso({ tipo: 'ok', texto: `${linha.titulo} está ativo de novo.` });
  };

  const pedirExclusao = (linha: LinhaCadastro) => {
    setConfirmacao({ acao: 'excluir', linha, usos: usosDoCadastro(tabela, linha.id) });
  };

  const confirmar = () => {
    if (!confirmacao || processando) return;
    const { acao, linha } = confirmacao;
    if (acao === 'inativar') {
      inativar(linha);
      return;
    }
    setProcessando(true);
    const resultado = onExcluir(tabela, linha.id, linha.titulo);
    setProcessando(false);
    if (resultado.ok === false) {
      if (resultado.usos.length > 0) setConfirmacao({ acao, linha, usos: resultado.usos });
      else {
        setConfirmacao(null);
        setAviso({ tipo: 'erro', texto: resultado.mensagem || 'Não deu para excluir.' });
      }
      return;
    }
    setConfirmacao(null);
    setDetalheId(null);
    setAviso({
      tipo: 'ok',
      texto: `${linha.titulo} excluído.`,
      desfazer: () => {
        const volta = ultimas.current.onRestaurar(resultado.exclusaoId);
        setAviso({ tipo: volta.ok ? 'ok' : 'erro', texto: volta.mensagem });
      },
    });
  };

  // ---- Seleção e exclusão em lote ---------------------------------------

  const alternarMarcado = (id: string) => setMarcados(atual => {
    const proximo = new Set(atual);
    if (proximo.has(id)) proximo.delete(id);
    else proximo.add(id);
    return proximo;
  });

  const alternarPagina = (ids: string[], marcar: boolean) => setMarcados(atual => {
    const proximo = new Set(atual);
    ids.forEach(id => (marcar ? proximo.add(id) : proximo.delete(id)));
    return proximo;
  });

  const pedirExclusaoEmLote = () => {
    const escolhidas = todasAsLinhas.filter(linha => marcados.has(linha.id));
    const livres: LinhaCadastro[] = [];
    const travados: ItemTravado[] = [];
    escolhidas.forEach(linha => {
      const usos = usosDoCadastro(tabela, linha.id);
      if (usos.length > 0) travados.push({ id: linha.id, titulo: linha.titulo, usos });
      else livres.push(linha);
    });
    setLote({ livres, travados });
  };

  const confirmarLote = () => {
    if (!lote || processando) return;
    setProcessando(true);
    const deFora = lote.travados.length;
    const resultado = ultimas.current.onExcluirVarios(tabela, lote.livres.map(linha => ({ id: linha.id, rotulo: linha.titulo })));
    setProcessando(false);
    setLote(null);
    if (resultado.excluidos.length === 0) {
      setAviso({ tipo: 'erro', texto: resultado.mensagem || 'Nenhum cadastro foi excluído.' });
      return;
    }
    setMarcados(new Set());
    setDetalheId(null);
    const total = resultado.excluidos.length;
    // Os travados na janela nem foram enviados; o App ainda pode travar algum que ganhou uso no meio.
    const ficaram = deFora + resultado.travados.length;
    const ids = resultado.excluidos.map(item => item.exclusaoId);
    setAviso({
      tipo: 'ok',
      texto: `${total.toLocaleString('pt-BR')} ${total === 1 ? 'cadastro excluído' : 'cadastros excluídos'}.${ficaram > 0 ? ` ${ficaram.toLocaleString('pt-BR')} ${ficaram === 1 ? 'ficou' : 'ficaram'} por estar em uso.` : ''}`,
      desfazer: () => {
        const volta = ultimas.current.onRestaurarVarios(ids);
        setAviso({ tipo: volta.ok ? 'ok' : 'erro', texto: volta.mensagem });
      },
    });
  };

  const restaurar = (exclusao: ExclusaoRegistro) => {
    setRestaurandoId(exclusao.id);
    const resultado = onRestaurar(exclusao.id);
    setRestaurandoId(null);
    setAviso({ tipo: resultado.ok ? 'ok' : 'erro', texto: resultado.mensagem });
  };

  const confirmarApagarDeVez = () => {
    if (!apagando) return;
    const resultado = onApagarDeVez(apagando.map(item => item.id));
    setApagando(null);
    setAviso({ tipo: resultado.ok ? 'ok' : 'erro', texto: resultado.mensagem });
  };

  // ---- Importar e exportar ------------------------------------------------

  const importarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    try {
      const { abas, ocultas } = await parseWorkbookFile(arquivo);
      const comLinhas = abas.filter(aba => aba.linhas.length > 0);
      if (comLinhas.length === 0) {
        setAviso({ tipo: 'erro', texto: ocultas > 0 && abas.length === 0
          ? 'A planilha só tem abas ocultas. Reexiba a aba do cadastro no Excel e importe de novo.'
          : 'A planilha não tem linhas para importar.' });
        return;
      }
      if (comLinhas.length === 1) setImportacao({ fileName: arquivo.name, rows: comLinhas[0].linhas });
      else setEscolhaDeAba({ fileName: arquivo.name, abas: comLinhas, sugerida: abaSugerida(comLinhas, [categoriaAtual.label, categoria]), ocultas });
    } catch (error: unknown) {
      console.error('Erro ao importar planilha de cadastros:', error);
      setAviso({ tipo: 'erro', texto: error instanceof Error && error.message ? error.message : 'Não foi possível ler a planilha. Use CSV, TSV, XLSX ou XLSM.' });
    } finally {
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  const confirmarImportacao = () => {
    if (!importacao || confirmandoImportacao) return;
    setConfirmandoImportacao(true);
    const resultado = onImportCadastros(categoria, importacao.rows);
    setAviso({ tipo: resultado.success ? 'ok' : 'erro', texto: resultado.message });
    setImportacao(null);
    setConfirmandoImportacao(false);
  };

  const exportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const { autoFitCorporateColumns, createCorporateWorkbook, downloadCorporateWorkbook, styleCorporateWorksheet } = await import('../utils/excelCorporate');
      const planilha = await createCorporateWorkbook();
      const aba = planilha.addWorksheet(categoriaAtual.label.slice(0, 31));
      const colunas = COLUNAS[categoria];
      aba.addRow([...colunas.map(coluna => coluna.label), ...(comSituacao ? ['Situação'] : []), 'Código']);
      linhasFiltradas.forEach(linha => aba.addRow([...colunas.map(coluna => linha.colunas[coluna.id] || ''), ...(comSituacao ? [linha.situacao] : []), linha.id]));
      styleCorporateWorksheet(aba, { title: categoriaAtual.label, headerRow: 1, freezeRows: 1, recordCount: linhasFiltradas.length });
      autoFitCorporateColumns(aba);
      const hoje = new Date();
      const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      await downloadCorporateWorkbook(planilha, `RENEA_${categoria}_${dia}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar cadastros:', error);
      setAviso({ tipo: 'erro', texto: 'Não deu para gerar a planilha. Tente de novo.' });
    } finally {
      setExportando(false);
    }
  };

  /** Colaboradores da lista filtrada (ex.: uma equipe) em Excel ou PDF. */
  const baixarEquipesExcel = async () => {
    const { baixarPlanilhaEquipes } = await import('../utils/exportarEquipesExcel');
    const hoje = new Date();
    const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    await baixarPlanilhaEquipes(gruposEquipe, funcionarios, empresas, dia);
  };

  const baixarLista = async (formato: 'excel' | 'pdf') => {
    if (exportando) return;
    setExportando(true);
    try {
      const { baixarExcelPessoas, baixarPdfPessoas } = await import('../utils/exportarPessoas');
      const lista = {
        titulo: filtros.equipe || 'Colaboradores',
        subtitulo: [filtros.equipe ? 'Colaboradores da equipe' : '', situacao === 'ativos' ? 'Só ativos' : situacao === 'inativos' ? 'Só inativos' : 'Todos'].filter(Boolean).join(' · '),
        pessoas: linhasFiltradas.map(linha => ({
          nome: linha.colunas.nome || linha.titulo,
          matricula: linha.colunas.matricula || '',
          cargo: linha.colunas.cargo || '',
          equipe: linha.colunas.equipe || '',
          lider: linha.colunas.lider || '',
          situacao: linha.situacao,
        })),
      };
      await (formato === 'excel' ? baixarExcelPessoas(lista) : baixarPdfPessoas(lista));
    } catch (error) {
      console.error('Erro ao baixar a lista:', error);
      setAviso({ tipo: 'erro', texto: 'Não deu para gerar o arquivo. Tente de novo.' });
    } finally {
      setExportando(false);
    }
  };

  // ---- Tela ---------------------------------------------------------------

  const filtrosDoTipo = FILTROS[categoria];
  // Colaboradores: a equipe fica à vista, ao lado da busca (pedido de 23/11/2026).
  const filtroPrincipal = categoria === 'funcionarios' ? filtrosDoTipo.find(filtro => filtro.id === 'equipe') : undefined;
  const filtrosExtras = filtrosDoTipo.filter(filtro => filtro !== filtroPrincipal);
  const filtrosAtivos = Object.entries(filtros).filter(([, valor]) => valor);
  const temConsulta = Boolean(busca) || filtrosAtivos.length > 0 || situacao !== 'ativos';
  const emLixeira = vista === 'lixeira';
  const emEstrutura = ehVistaEstrutura(vista);
  const mostrarLixeira = podeExcluir || lixeira.length > 0;

  const abas = abasCadastros(item => totais.get(item) ?? 0);

  const cadastrarCargosQueFaltam = () => {
    const novos = novosCargos(faltamCargos, cargos);
    if (novos.length === 0) return;
    props.onSaveCargos(novos);
    setAviso({ tipo: 'ok', texto: `${novos.length} cargos cadastrados.` });
  };

  const filtrosDaLista = (
    <div data-cadastros-reveal className="space-y-2">
      {categoria === 'equipes' && todasAsLinhas.length > 0 && (() => {
        const ativas = (props.gruposEquipe).filter(item => item.status !== 'inativo');
        const emEquipe = new Set(ativas.flatMap(item => item.funcionarioIds));
        const ativos = funcionarios.filter(item => item.ativo !== false);
        const quadros = [
          ['Equipes ativas', ativas.length],
          ['Pessoas em equipe', ativos.filter(item => emEquipe.has(item.id)).length],
          ['Sem equipe', ativos.filter(item => !emEquipe.has(item.id)).length],
        ] as const;
        return (
          <dl aria-label="Resumo das equipes" data-testid="resumo-equipes" className="grid grid-cols-3 gap-2">
            {quadros.map(([rotulo, total]) => (
              <div key={rotulo} className="flex min-h-16 flex-col-reverse justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 sm:px-4">
                <dt className={`text-sm font-semibold ${rotulo === 'Sem equipe' && total > 0 ? 'text-[#c2410c]' : 'text-slate-600'}`}>{rotulo}</dt>
                <dd className="text-2xl font-black tabular-nums text-slate-900">{total.toLocaleString('pt-BR')}</dd>
              </div>
            ))}
          </dl>
        );
      })()}
      {categoria === 'funcionarios' && todasAsLinhas.length > 0 && (
        <ResumoColaboradores
          linhas={todasAsLinhas}
          filtros={filtros}
          onFiltrar={(filtro, valor) => {
            setSituacao('ativos');
            setFiltros(filtro ? { [filtro]: valor || '' } : {});
          }}
        />
      )}
      <FilterBar label="Filtros de cadastros" className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 basis-full sm:min-w-56 sm:flex-1 sm:basis-auto">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                ref={buscaRef}
                type="search"
                aria-label="Buscar cadastros"
                placeholder="Buscar"
                value={busca}
                onChange={event => setBusca(event.target.value)}
                className={`${CAMPO} pl-11`}
              />
            </div>
            {comSituacao && (
              <div role="radiogroup" aria-label="Situação" className="grid shrink-0 grid-cols-3 overflow-hidden max-sm:basis-full rounded-xl border border-slate-200 bg-white text-sm font-semibold">
                {([
                  ['ativos', 'Ativos', contagem.ativos],
                  ['inativos', 'Inativos', contagem.inativos],
                  ['todos', 'Todos', contagem.todos],
                ] as const).map(([valor, rotulo, total]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={situacao === valor}
                    onClick={() => setSituacao(valor)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap border-r border-slate-200 px-3 transition-colors duration-150 last:border-0 ${FOCO} ${situacao === valor ? 'bg-[#176b4d] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {rotulo}
                    <span className={`text-xs tabular-nums ${situacao === valor ? 'text-white' : 'text-slate-600'}`}>{total}</span>
                  </button>
                ))}
              </div>
            )}
            {filtroPrincipal && (
              <select
                aria-label={filtroPrincipal.label}
                value={filtros[filtroPrincipal.id] || ''}
                onChange={event => setFiltros(atual => ({ ...atual, [filtroPrincipal.id]: event.target.value }))}
                className={`${CAMPO} cursor-pointer sm:w-60 max-sm:basis-full ${filtros[filtroPrincipal.id] ? 'border-[#f26a2e]/60 bg-orange-50/40' : ''}`}
                data-testid="cadastro-filtro-equipe"
              >
                <option value="">{filtroPrincipal.label}: todas</option>
                {opcoesDoFiltro(todasAsLinhas, filtroPrincipal.id).map(opcao => (
                  <option key={opcao.valor} value={opcao.valor}>{`${opcao.valor} (${opcao.total})`}</option>
                ))}
              </select>
            )}
            {filtrosExtras.length > 0 && (
              <button
                type="button"
                aria-expanded={filtrosAbertos}
                aria-controls="cadastros-filtros-extras"
                onClick={() => setFiltrosAbertos(atual => !atual)}
                className={`${BOTAO_SECUNDARIO} max-sm:flex-1 ${filtrosAtivos.some(([id]) => id !== filtroPrincipal?.id) ? 'border-[#f26a2e]/60' : ''}`}
              >
                <SlidersHorizontal className="size-5" aria-hidden="true" />
                {filtrosAtivos.filter(([id]) => id !== filtroPrincipal?.id).length > 0 ? `Filtros · ${filtrosAtivos.filter(([id]) => id !== filtroPrincipal?.id).length}` : 'Filtros'}
              </button>
            )}
          </div>

          {filtrosExtras.length > 0 && filtrosAbertos && (
            <div id="cadastros-filtros-extras" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {filtrosExtras.map(filtro => (
                <label key={filtro.id} className="min-w-0">
                  <span className="sr-only">{filtro.label}</span>
                  <select
                    value={filtros[filtro.id] || ''}
                    onChange={event => setFiltros(atual => ({ ...atual, [filtro.id]: event.target.value }))}
                    className={`${CAMPO} cursor-pointer ${filtros[filtro.id] ? 'border-[#f26a2e]/60 bg-orange-50/40' : ''}`}
                  >
                    <option value="">{filtro.label}: todos</option>
                    {opcoesDoFiltro(todasAsLinhas, filtro.id).map(opcao => (
                      <option key={opcao.valor} value={opcao.valor}>{`${opcao.valor} (${opcao.total})`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}

          {(filtrosAtivos.length > 0 || temConsulta) && (
            <div className="flex flex-wrap items-center gap-2">
              {filtrosAtivos.map(([id, valor]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltros(atual => ({ ...atual, [id]: '' }))}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#f26a2e]/40 bg-orange-50 px-3 text-sm font-medium text-slate-800 ${FOCO}`}
                >
                  {filtrosDoTipo.find(filtro => filtro.id === id)?.label}: {valor}
                  <X className="size-4" aria-label="Tirar filtro" />
                </button>
              ))}
              {temConsulta && (
                <button type="button" onClick={limparFiltros} className={`min-h-9 rounded-lg px-2 text-sm font-semibold text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline ${FOCO}`}>
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </FilterBar>

      {categoria === 'funcionarios' && (filtros.equipe || '') !== '' && (
        <div role="region" aria-label="Baixar a equipe" data-testid="equipe-baixar" className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="min-w-0 flex-1 text-sm text-slate-700 max-sm:basis-full">
            <strong className="text-slate-900">{filtros.equipe}</strong>
            {` · ${linhasFiltradas.length} ${linhasFiltradas.length === 1 ? 'pessoa' : 'pessoas'} na lista`}
          </p>
          <button type="button" onClick={() => void baixarLista('excel')} disabled={exportando || linhasFiltradas.length === 0} className={`${BOTAO_SECUNDARIO} bg-white max-sm:flex-1`} data-testid="equipe-baixar-excel">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
            Baixar Excel
          </button>
          <button type="button" onClick={() => void baixarLista('pdf')} disabled={exportando || linhasFiltradas.length === 0} className={`${BOTAO_SECUNDARIO} bg-white max-sm:flex-1`} data-testid="equipe-baixar-pdf">
            <FileText className="size-5" aria-hidden="true" />
            Baixar PDF
          </button>
        </div>
      )}

      {faltamCargos.length > 0 && podeEditar && (
        <div role="region" aria-label="Cargos sem cadastro" data-testid="cargos-faltando" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="min-w-0 flex-1 text-sm text-slate-600">
            <strong className="text-slate-900">{faltamCargos.length} {faltamCargos.length === 1 ? 'cargo usado' : 'cargos usados'} pelos colaboradores {faltamCargos.length === 1 ? 'ainda não está' : 'ainda não estão'} aqui</strong>
            {`: ${faltamCargos.slice(0, 4).map(item => item.nome).join(', ')}${faltamCargos.length > 4 ? ' e outros' : ''}. O nível de cada um vem sugerido pelo nome e pode ser trocado depois.`}
          </p>
          <button type="button" onClick={cadastrarCargosQueFaltam} className={`${BOTAO_PRIMARIO} px-4 max-sm:basis-full`} data-testid="cargos-cadastrar-todos">
            <Plus className="size-5" aria-hidden="true" />
            Cadastrar {faltamCargos.length === 1 ? 'este cargo' : `os ${faltamCargos.length}`}
          </button>
        </div>
      )}

      {podeExcluir && marcados.size > 0 && (
        <div role="region" aria-label="Cadastros marcados" data-testid="cadastro-barra-selecao" className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-2 sm:pl-4">
          <p className="basis-full px-2 pt-1 text-sm font-bold text-emerald-900 sm:mr-auto sm:basis-auto sm:p-0" aria-live="polite">
            {marcados.size.toLocaleString('pt-BR')} {marcados.size === 1 ? 'marcado' : 'marcados'}
          </p>
          {marcados.size < linhasFiltradas.length && (
            <button type="button" onClick={() => alternarPagina(linhasFiltradas.map(linha => linha.id), true)} className={`${BOTAO_SECUNDARIO} px-3 max-sm:flex-1`} data-testid="cadastro-marcar-todos">
              Marcar todos os {linhasFiltradas.length.toLocaleString('pt-BR')}
            </button>
          )}
          <button type="button" onClick={() => setMarcados(new Set())} className={`${BOTAO_SECUNDARIO} px-3 max-sm:flex-1`}>
            Desmarcar
          </button>
          <button type="button" onClick={pedirExclusaoEmLote} className={`${BOTAO_PERIGO} px-3 max-sm:basis-full`} data-testid="cadastro-excluir-marcados">
            <Trash2 className="size-5" aria-hidden="true" />
            Excluir marcados
          </button>
        </div>
      )}
    </div>
  );

  const cabecalhoDaLixeira = (
    <div data-cadastros-reveal className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="min-w-0 flex-1 text-sm text-slate-600">
        <strong className="text-slate-900">Cadastros excluídos.</strong> Restaurar devolve o cadastro para a lista em todos os aparelhos. Excluir de vez tira daqui e não tem volta.
      </p>
      <button type="button" onClick={() => escolherVista(categoria)} className={BOTAO_SECUNDARIO} data-testid="lixeira-voltar">
        <ArrowLeft className="size-5" aria-hidden="true" />
        Voltar
      </button>
      {podeExcluir && lixeira.length > 1 && (
        <button type="button" onClick={() => setApagando(lixeira)} className={BOTAO_PERIGO_LEVE} data-testid="lixeira-esvaziar">
          <Trash2 className="size-5" aria-hidden="true" />
          Esvaziar Lixeira
        </button>
      )}
    </div>
  );

  return (
    <TelaCheia
      ref={escopo}
      id="cadastros-tab"
      testId="cadastros-tab"
      rotulo="Cadastros"
      longa={emLixeira || emEstrutura}
      idAbaAtiva={idDaAba('cadastros', vista)}
      idDados="cadastros-dados"
      chaveRolagem={vista}
      cabecalho={(
        <div data-cadastros-reveal>
          <PageHeader
            className="cadastros-header"
            eyebrow="Base corporativa"
            title="Cadastros"
            abas={<AbasDaTela id="cadastros" rotulo="Tipos de cadastro" abas={abas} ativa={vista} onTrocar={escolherVista} idPainel="cadastros-dados" testId="cadastro-aba" />}
            actions={emEstrutura ? undefined : <>
              {!emLixeira && <div className="relative">
                <button type="button" onClick={() => setAcoesAbertas(atual => !atual)} aria-expanded={acoesAbertas} aria-haspopup="menu" className={`${BOTAO_SECUNDARIO} size-11 min-w-11 justify-center !px-0`} aria-label="Mais ações">
                  <MoreVertical className="size-5" aria-hidden="true" />
                </button>
                {acoesAbertas && <div role="menu" className="absolute right-0 top-12 z-30 grid min-w-48 gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button type="button" role="menuitem" onClick={() => { setAcoesAbertas(false); void exportar(); }} disabled={exportando || linhasFiltradas.length === 0} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="mr-2 inline size-4" aria-hidden="true" />{exportando ? 'Gerando…' : 'Exportar lista'}</button>
                  {categoria === 'funcionarios' && (
                    <button type="button" role="menuitem" onClick={() => { setAcoesAbertas(false); void baixarLista('pdf'); }} disabled={exportando || linhasFiltradas.length === 0} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FileText className="mr-2 inline size-4" aria-hidden="true" />Baixar lista em PDF</button>
                  )}
                  {categoria === 'equipes' && (
                    <button type="button" role="menuitem" onClick={() => { setAcoesAbertas(false); void baixarEquipesExcel(); }} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="mr-2 inline size-4" aria-hidden="true" />Baixar equipes e pessoas</button>
                  )}
                  {categoria === 'equipes' && podeEditar && props.onSyncEquipesPlanilha && (
                    <button type="button" role="menuitem" data-testid="equipes-sincronizar" onClick={() => { setAcoesAbertas(false); sincronizarRef.current?.escolherArquivo(); }} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Upload className="mr-2 inline size-4" aria-hidden="true" />Atualizar pela planilha</button>
                  )}
                  {podeEditar && importaPlanilha && <button type="button" role="menuitem" onClick={() => { setAcoesAbertas(false); arquivoRef.current?.click(); }} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Upload className="mr-2 inline size-4" aria-hidden="true" />Importar planilha</button>}
                  {mostrarLixeira && <button type="button" role="menuitem" data-testid="cadastro-categoria-lixeira" onClick={() => escolherVista('lixeira')} className="min-h-10 rounded-lg px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Trash2 className="mr-2 inline size-4" aria-hidden="true" />Lixeira{lixeira.length > 0 ? ` (${lixeira.length.toLocaleString('pt-BR')})` : ''}</button>}
                </div>}
              </div>}
              <input ref={arquivoRef} type="file" accept=".xlsx,.xlsm,.csv,.tsv" onChange={importarArquivo} className="hidden" />
              {props.onSyncEquipesPlanilha && (
                <SincronizarEquipesPlanilha ref={sincronizarRef} funcionarios={funcionarios} gruposEquipe={gruposEquipe} obras={obras} empresas={empresas} onSync={props.onSyncEquipesPlanilha} />
              )}
              {podeEditar && (
                <button type="button" data-testid="cadastro-acao-principal" onClick={abrirNovo} className={`${BOTAO_PRIMARIO} max-sm:order-first max-sm:min-w-0 px-5`}>
                  <Plus className="size-5" aria-hidden="true" />
                  {categoriaAtual.acaoNovo}
                  <kbd className="hidden rounded-md bg-white/15 px-1.5 font-mono text-xs xl:inline">N</kbd>
                </button>
              )}
            </>}
          />
        </div>
      )}
      faixa={emEstrutura ? undefined : emLixeira ? cabecalhoDaLixeira : filtrosDaLista}
    >
      {vista === 'organograma' ? (
        <Organograma
          funcionarios={funcionarios}
          cargos={cargos}
          empresas={empresas}
          gruposEquipe={gruposEquipe}
          focoId={focoOrganograma}
          onAbrirPessoa={id => { escolherVista('funcionarios'); setDetalheId(id); }}
        />
      ) : vista === 'piramide' ? (
        <Piramide funcionarios={funcionarios} cargos={cargos} empresas={empresas} onIrParaCargos={() => escolherVista('cargos')} />
      ) : emLixeira ? (
        <CadastroLixeira exclusoes={lixeira} podeRestaurar={podeExcluir} restaurandoId={restaurandoId} onRestaurar={restaurar} onExcluirDeVez={item => setApagando([item])} />
      ) : (
        <section id="database-lists-viewport" aria-label={`Lista de ${categoriaAtual.label.toLowerCase()}`} className="flex min-h-0 flex-1 flex-col">
          {categoria === 'equipes' ? (
            <EquipesCartoes
              linhas={linhasFiltradas}
              dados={dados}
              selecionadoId={detalheId}
              onAbrir={linha => setDetalheId(linha.id)}
              vazio={(
                <div data-testid="cadastro-lista-vazia" className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <strong className="block text-slate-900">{todasAsLinhas.length === 0 ? 'Nenhuma equipe ainda' : 'Nenhuma equipe encontrada'}</strong>
                  <p className="mt-1 text-sm text-slate-600">{todasAsLinhas.length === 0 ? 'Crie a primeira pelo botão verde Nova equipe.' : 'Mude a busca ou os filtros.'}</p>
                </div>
              )}
            />
          ) : (
          <CadastroLista
            titulo={categoriaAtual.label}
            linhas={linhasFiltradas}
            colunas={COLUNAS[categoria]}
            mostrarSituacao={comSituacao}
            ordem={ordem}
            onOrdenar={ordenar}
            pagina={pagina}
            onPagina={setPagina}
            selecionadoId={detalheId}
            onAbrir={linha => setDetalheId(linha.id)}
            selecao={podeExcluir ? { marcados, onAlternar: alternarMarcado, onAlternarPagina: alternarPagina } : undefined}
            vazio={todasAsLinhas.length === 0
              ? {
                  titulo: `Nenhum cadastro em ${categoriaAtual.label.toLowerCase()}`,
                  texto: podeEditar ? `Cadastre o primeiro pelo botão verde${importaPlanilha ? ' ou importe uma planilha' : ''}.` : 'Ainda não há nada cadastrado aqui.',
                  acao: podeEditar ? { label: categoriaAtual.acaoNovo, onClick: abrirNovo } : undefined,
                }
              : {
                  titulo: 'Nada encontrado',
                  texto: 'Nenhum cadastro bate com a busca e os filtros escolhidos.',
                  acao: { label: 'Limpar filtros', onClick: limparFiltros },
                }}
          />
          )}
        </section>
      )}

      {linhaDetalhe && !formulario && !confirmacao && !emEstrutura && (
        <CadastroDetalhe
          categoria={categoria}
          linha={linhaDetalhe}
          dados={dados}
          usos={usosDetalhe}
          historico={historicoDetalhe}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
          onEditar={() => abrirEdicao(linhaDetalhe)}
          onInativar={() => setConfirmacao({ acao: 'inativar', linha: linhaDetalhe, usos: [] })}
          onReativar={() => reativar(linhaDetalhe)}
          onExcluir={() => pedirExclusao(linhaDetalhe)}
          onFechar={() => setDetalheId(null)}
          onVerNoOrganograma={categoria === 'funcionarios' ? () => { const id = linhaDetalhe.id; escolherVista('organograma'); setFocoOrganograma(id); } : undefined}
        />
      )}

      {formulario && (
        <CadastroFormulario
          key={formulario.editandoId || 'novo'}
          categoria={categoria}
          titulo={formulario.editandoId ? todasAsLinhas.find(linha => linha.id === formulario.editandoId)?.titulo || categoriaAtual.label : categoriaAtual.acaoNovo}
          editandoId={formulario.editandoId}
          valoresIniciais={formulario.valores}
          dados={dados}
          erro={erroFormulario}
          salvando={salvando}
          onSalvar={salvarFormulario}
          onFechar={() => setFormulario(null)}
        />
      )}

      {lote && (
        <CadastroConfirmacaoLote
          tipo={categoriaAtual.label}
          livres={lote.livres.length}
          travados={lote.travados}
          processando={processando}
          onConfirmar={confirmarLote}
          onCancelar={() => setLote(null)}
        />
      )}

      {apagando && (
        <CadastroConfirmacao
          acao="excluir-de-vez"
          nome={apagando.length === 1 ? apagando[0].rotulo : `${apagando.length.toLocaleString('pt-BR')} cadastros da Lixeira`}
          codigo=""
          usos={[]}
          podeInativar={false}
          processando={false}
          onConfirmar={confirmarApagarDeVez}
          onInativarNoLugar={() => setApagando(null)}
          onCancelar={() => setApagando(null)}
        />
      )}

      {confirmacao && (
        <CadastroConfirmacao
          acao={confirmacao.acao}
          nome={confirmacao.linha.titulo}
          codigo={confirmacao.linha.id}
          usos={confirmacao.usos}
          podeInativar={comSituacao}
          processando={processando}
          onConfirmar={confirmar}
          onInativarNoLugar={() => setConfirmacao({ acao: 'inativar', linha: confirmacao.linha, usos: [] })}
          onCancelar={() => setConfirmacao(null)}
        />
      )}

      <Modal
        open={Boolean(escolhaDeAba)}
        onClose={() => setEscolhaDeAba(null)}
        title="Qual aba da planilha tem os cadastros?"
        description={escolhaDeAba ? (
          <>
            {escolhaDeAba.fileName} tem {escolhaDeAba.abas.length} abas com linhas.
            {escolhaDeAba.ocultas > 0 && ` ${escolhaDeAba.ocultas} aba${escolhaDeAba.ocultas > 1 ? 's ocultas foram ignoradas' : ' oculta foi ignorada'}.`}
          </>
        ) : undefined}
        className="sm:max-w-lg"
      >
        {escolhaDeAba && (
          <div data-testid="cadastro-escolher-aba">
            <div className="grid gap-2">
              {escolhaDeAba.abas.map(aba => {
                const sugerida = aba.nome === escolhaDeAba.sugerida;
                return (
                  <button
                    key={aba.nome}
                    type="button"
                    onClick={() => { setImportacao({ fileName: `${escolhaDeAba.fileName} · ${aba.nome}`, rows: aba.linhas }); setEscolhaDeAba(null); }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left transition duration-200 ${FOCO} ${sugerida ? 'border-[#176b4d] bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-base text-slate-900">{aba.nome}</strong>
                      <span className="text-sm text-slate-500">{aba.linhas.length.toLocaleString('pt-BR')} linha{aba.linhas.length === 1 ? '' : 's'}</span>
                    </span>
                    {sugerida && <span className="shrink-0 rounded-full bg-[#176b4d] px-2.5 py-1 text-xs font-bold text-white">Sugerida</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-slate-500">Depois de escolher, você confere a amostra antes de gravar.</p>
          </div>
        )}
      </Modal>

      <SpreadsheetImportReview
        open={Boolean(importacao)}
        title={`Importar ${categoriaAtual.label.toLowerCase()}`}
        fileName={importacao?.fileName || ''}
        validCount={importacao?.rows.length || 0}
        columns={importacao ? Object.keys(importacao.rows[0] || {}) : []}
        rows={importacao?.rows || []}
        note="Cadastros com a mesma chave são atualizados. Confira a amostra antes de gravar."
        confirming={confirmandoImportacao}
        onCancel={() => setImportacao(null)}
        onConfirm={confirmarImportacao}
      />

    </TelaCheia>
  );
}

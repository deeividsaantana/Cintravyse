import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, FileText, Link2, PenLine, Printer, TrendingUp, UserMinus, UserPlus, XCircle } from 'lucide-react';
import { CLIENTE, PRODUTO } from '../../config/marca';
import { BOTAO_PERIGO_LEVE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, CARTAO, FOCO } from '../cadastros/estilos';
import {
  CARGO_DA_ETAPA,
  DOCUMENTOS,
  ETAPAS,
  SITUACOES,
  SOLICITACOES,
  etapaPendente,
  nomeDaEtapa,
  podeDecidir,
  resumoDoPedido,
  tipoDoPedido,
  validarFormulario,
} from '../../../api/_shared/contratacao-regras.js';
import {
  apagarAssinaturaSalva,
  criarContratacao,
  decidirContratacao,
  type AssinaturaContratacao,
  type AssinaturaEnviada,
  type Etapa,
  type FormularioContratacao,
  type Leitor,
  type PedidoContratacao,
  type TipoSolicitacao,
} from '../../services/contratacaoApi';
import { QuadroAssinatura } from './QuadroAssinatura';
import { CorpoPromocao } from './CorpoPromocao';
import { CorpoDesligamento } from './CorpoDesligamento';
import { CorpoContratacao } from './CorpoContratacao';
import { ResumoDoPedido } from './ResumoDoPedido';
import { CabecalhoPapel } from './papel';
import { ListaDeAssinaturas } from './SeloSituacaoContratacao';
import { dataBr, dataHoraBr } from './formatos';
import { imprimirEmUmaFolha } from '../../utils/imprimirEmUmaFolha';

const hojeLocal = () => {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const novaChave = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, '');

/** Bloco da folha de contratação: faixa com borda em cima, título pequeno em maiúsculas. */
function Bloco({ titulo, children, className = '' }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`border-t border-slate-200 px-4 py-4 first:border-t-0 sm:px-5 ${className}`}>
      {titulo && <h3 className="mb-3 text-xs font-semibold uppercase text-[#5b6870]">{titulo}</h3>}
      {children}
    </div>
  );
}

const ESCOLHAS: Array<{ tipo: TipoSolicitacao; titulo: string; texto: string; Icone: typeof UserPlus }> = [
  { tipo: 'contratacao', titulo: 'Contratação', texto: 'Pedir uma pessoa nova para a equipe.', Icone: UserPlus },
  { tipo: 'promocao', titulo: 'Promoção', texto: 'Mudar o cargo ou o salário de um colaborador.', Icone: TrendingUp },
  { tipo: 'desligamento', titulo: 'Desligamento', texto: 'Desligar um colaborador e seguir o check list.', Icone: UserMinus },
];

interface Props {
  leitor: Leitor;
  /** Aberto pelo link individual: o token vai junto na assinatura. */
  token?: string;
  /** Veio do botão "Baixar documento assinado" da lista: abre já imprimindo. */
  baixarAoAbrir?: boolean;
  /** Dentro do ERP: copia o link individual deste pedido. */
  onCopiarLink?: () => void;
  /** Sem pedido: folha em branco para pedir. Com pedido: folha travada. */
  pedido?: PedidoContratacao;
  onVoltar?: () => void;
  onCriado?: (pedido: PedidoContratacao) => void;
  onAtualizado?: () => void;
}

/**
 * As 3 solicitações de RH, cada uma no desenho do seu modelo de papel:
 * contratação (SGR-FRH-21-373-01-000-000-0008), promoção ("Solicitação de
 * cargo e salário", …0011) e desligamento ("Check list de desligamento",
 * …0027). Em branco: primeiro escolhe o tipo, depois só preenche e salva; o
 * sistema gera o link. Salvo, os dados ficam travados e passam por 3
 * assinaturas, nesta ordem: 1ª Recursos Humanos, 2ª Gerência, 3ª Gerência.
 * O quadro de assinar fica logo abaixo das assinaturas. O servidor e o banco
 * conferem tudo de novo.
 */
export function FolhaContratacao({ leitor, token, baixarAoAbrir = false, onCopiarLink, pedido, onVoltar, onCriado, onAtualizado }: Props) {
  const novo = !pedido;
  const [tipoNovo, setTipoNovo] = useState<TipoSolicitacao | null>(null);
  const tipo: TipoSolicitacao | null = pedido ? tipoDoPedido(pedido.form) as TipoSolicitacao : tipoNovo;
  const [form, setForm] = useState<FormularioContratacao>(() => pedido?.form ?? {
    data: hojeLocal(), candidato: '', cpf: '', inicio: '', prioridade: '', motivo: '', motivoOutro: '', tipo: '', posicao: '', quantidade: '1',
    salario: '', requisitante: leitor.nome, area: '', itens: [], obs: '', aprovados: '', comentarios: '',
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [recusando, setRecusando] = useState(false);
  const [errosNoEnvio, setErrosNoEnvio] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [comentario, setComentario] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState('');
  const [assinaturaSalva, setAssinaturaSalva] = useState(leitor.assinaturaSalva ?? null);
  const chave = useRef(novaChave());
  const folhaRef = useRef<HTMLElement>(null);
  // Imprime ou salva em PDF a própria folha da tela, numa folha A4 só e sem
  // o endereço do site: menu, botões e o quadro de assinar não vão para o papel.
  const documentoRef = useRef<HTMLDetailsElement>(null);
  // O documento completo fica recolhido na tela; para imprimir, abre antes.
  const imprimir = (titulo: string) => {
    if (documentoRef.current) documentoRef.current.open = true;
    if (folhaRef.current) imprimirEmUmaFolha(folhaRef.current, { titulo });
  };
  const quadroRef = useRef<HTMLElement>(null);

  const assinaturas = pedido?.signatures ?? [];
  const pendente = (pedido ? etapaPendente(pedido) : null) as Etapa | null;
  const minhaVez = Boolean(pedido && podeDecidir(pedido, assinaturas, leitor));
  const totalAssinado = assinaturas.filter(item => (ETAPAS as string[]).includes(item.stage)).length;
  const concluido = pedido?.status === 'concluido';
  const documento = DOCUMENTOS[tipo ?? 'contratacao'];
  const resumo = pedido ? resumoDoPedido(pedido.form) : null;
  const tituloDoArquivo = pedido ? `${pedido.request_number} - ${documento.titulo}${concluido ? ' assinada' : ''}` : '';
  // Comentário que cada pessoa deixou ao assinar (ex.: a avaliação do RH).
  const comentariosAoAssinar = (pedido?.history ?? []).filter(evento => evento.action.startsWith('assinou_') && evento.details?.reason);
  const avaliacaoDoRh = comentariosAoAssinar.find(evento => evento.action === 'assinou_rh')?.details.reason;

  useEffect(() => {
    if (baixarAoAbrir && concluido) imprimir(tituloDoArquivo);
  }, [baixarAoAbrir, concluido, tituloDoArquivo]);
  const totalErros = useMemo(() => Object.keys(erros).length, [erros]);

  const escolherTipo = (escolhido: TipoSolicitacao) => {
    setTipoNovo(escolhido);
    setForm(atual => ({ ...atual, solicitacao: escolhido }));
    setErros({});
    setErrosNoEnvio(false);
  };

  const mudar = <K extends keyof FormularioContratacao>(campo: K, valor: FormularioContratacao[K]) => {
    // Folha assinada fica travada: nada muda, nem na tela.
    if (!novo) return;
    setForm(atual => ({ ...atual, [campo]: valor }));
    setErros(atual => { const { [campo]: _sai, ...resto } = atual; return resto; });
  };
  const alternarNaLista = (campo: keyof FormularioContratacao, item: string) => {
    const atual = (form[campo] as string[] | undefined) ?? [];
    mudar(campo, (atual.includes(item) ? atual.filter(valor => valor !== item) : [...atual, item]) as never);
  };
  const alternarItem = (item: string) => {
    const marcado = form.itens.includes(item);
    mudar('itens', item === 'nenhum'
      ? (marcado ? [] : ['nenhum'])
      : (marcado ? form.itens.filter(atual => atual !== item) : [...form.itens.filter(atual => atual !== 'nenhum'), item]));
  };

  const salvar = async () => {
    setFalha('');
    const { erros: encontrados } = validarFormulario(form);
    setErros(encontrados);
    setErrosNoEnvio(true);
    if (Object.keys(encontrados).length) {
      folhaRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(encontrados)[0]}"]`)?.focus();
      return;
    }
    setOcupado(true);
    try {
      const criado = await criarContratacao(form, chave.current);
      chave.current = novaChave();
      onCriado?.(criado);
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(false);
    }
  };

  // Folha nova segue o padrão de lançamento: Ctrl+S salva e Esc fecha.
  useEffect(() => {
    if (!novo) return undefined;
    const teclar = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!ocupado && tipo) void salvar();
      } else if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        onVoltar?.();
      }
    };
    document.addEventListener('keydown', teclar);
    return () => document.removeEventListener('keydown', teclar);
  });

  const assinar = async (assinatura: AssinaturaEnviada) => {
    if (!pedido) return;
    setOcupado(true);
    setFalha('');
    try {
      await decidirContratacao(pedido, 'aprovar', assinatura, comentario.trim() || undefined, token);
      onAtualizado?.();
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const recusar = async () => {
    if (!pedido) return;
    setOcupado(true);
    setFalha('');
    try {
      await decidirContratacao(pedido, 'recusar', undefined, motivoRecusa, token);
      setRecusando(false);
      onAtualizado?.();
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const apagarSalva = async () => {
    setFalha('');
    try {
      await apagarAssinaturaSalva();
      setAssinaturaSalva(null);
    } catch (erro) {
      setFalha(erro instanceof Error ? erro.message : 'Não foi possível apagar.');
    }
  };

  const erroDe = (nome: string) => (erros[nome] ? { 'aria-invalid': true as const, 'aria-describedby': `ct-${nome}-erro` } : {});
  const mensagem = (nome: string) => erros[nome] && <p id={`ct-${nome}-erro`} className="text-xs font-semibold text-rose-700">{erros[nome]}</p>;
  const corpo = { form, novo, mudar: (campoMudado: keyof FormularioContratacao, valor: string) => mudar(campoMudado, valor as never), alternar: alternarNaLista, erroDe, mensagem };

  /** O desenho (ou o nome) de cada assinatura, igual nos 3 documentos. */
  const imagemDaAssinatura = (etapa: Etapa, alturaImagem = 'h-20') => {
    const assinatura: AssinaturaContratacao | undefined = assinaturas.find(item => item.stage === etapa);
    const daVez = !assinatura && pendente === etapa;
    return (
      <div className={`grid ${alturaImagem} place-items-center overflow-hidden`} data-testid={`assinatura-${etapa}`}>
        {assinatura?.image_data
          ? <img src={assinatura.image_data} alt={`Assinatura de ${assinatura.signer_name}`} className="h-full max-w-full object-contain" />
          : assinatura
            ? <span className="truncate px-2 font-serif text-2xl italic text-slate-900">{assinatura.signer_name}</span>
            : daVez
              ? <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-inset ring-amber-300"><PenLine className="size-3.5" aria-hidden="true" /> Assinatura pendente</span>
              : <span className="text-xs italic text-slate-500">Aguardando a assinatura anterior</span>}
      </div>
    );
  };
  /** Quem assinou, cargo, data e hora exatas e o hash de autenticidade. */
  const detalhesDaAssinatura = (etapa: Etapa) => {
    const assinatura = assinaturas.find(item => item.stage === etapa);
    if (!assinatura) return null;
    return (
      <dl className="space-y-0.5 text-center text-xs text-[#5b6870]">
        <dd className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{assinatura.signer_name}</dd>
        <dd>{CARGO_DA_ETAPA[etapa]} · {dataHoraBr(assinatura.signed_at, true)}</dd>
        {assinatura.hash_validacao && (
          // Na tela, só o começo do código (cabe e não assusta); no papel, ele inteiro.
          <dd className="font-mono text-xs [overflow-wrap:anywhere]" title={assinatura.hash_validacao}>
            Código: <span className="print:hidden [.folha-imprimindo_&]:hidden">{assinatura.hash_validacao.slice(0, 16).toUpperCase()}…</span>
            <span className="hidden print:inline [.folha-imprimindo_&]:inline">{assinatura.hash_validacao}</span>
          </dd>
        )}
      </dl>
    );
  };
  const ordem = (etapa: Etapa) => `${ETAPAS.indexOf(etapa) + 1}ª assinatura · ${CARGO_DA_ETAPA[etapa]}`;

  const listaDeComentarios = comentariosAoAssinar.length > 0 && (
    <ul className="space-y-1 text-sm text-slate-900">
      {comentariosAoAssinar.map((evento, indice) => <li key={indice}><strong>{evento.actor_name}:</strong> {evento.details.reason}</li>)}
    </ul>
  );

  const listaDeComentariosContratacao = listaDeComentarios && (
    <div className="mt-2 border border-[#26302b] px-2.5 py-1.5">
      <p className="text-xs font-semibold text-[#5b6870]">Comentários de quem assinou</p>
      {listaDeComentarios}
    </div>
  );

  // Contratação: quadro de assinaturas do formulário, uma coluna por etapa,
  // com o desenho em cima da linha e quem assinou embaixo, como no papel.
  const assinaturasContratacao = (
    <div className="break-inside-avoid px-4 pt-3 sm:px-6">
      <div className="border border-[#26302b]">
        <h3 className="border-b border-[#26302b] bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-900">6. Assinaturas</h3>
        <div className="grid sm:grid-cols-3">
          {(ETAPAS as Etapa[]).map((etapa, indice) => (
            <div key={etapa} className={`px-3 pb-3 pt-2 ${indice > 0 ? 'border-t border-[#26302b] sm:border-l sm:border-t-0' : ''} ${pendente === etapa ? 'bg-amber-50/50' : ''}`}>
              <p className="text-xs font-semibold text-[#5b6870]">{ETAPAS.indexOf(etapa) + 1}ª assinatura</p>
              {imagemDaAssinatura(etapa)}
              <div className="border-t border-[#26302b] pt-1 text-center text-sm font-bold uppercase text-slate-900">{CARGO_DA_ETAPA[etapa]}</div>
              <div className="mt-1">{detalhesDaAssinatura(etapa)}</div>
            </div>
          ))}
        </div>
      </div>
      {listaDeComentariosContratacao}
    </div>
  );

  // Promoção: "APROVAÇÕES" com linhas de assinatura, como na planilha.
  const linhaDeAssinatura = (etapa: Etapa, cargo: string) => (
    <div className="break-inside-avoid">
      {imagemDaAssinatura(etapa)}
      <div className="mt-1 border-t border-[#26302b] pt-1 text-center text-sm uppercase text-slate-900">{cargo}</div>
      <p className="text-center text-xs text-[#5b6870]">{ordem(etapa)}</p>
      <div className="mt-1">{detalhesDaAssinatura(etapa)}</div>
    </div>
  );
  const assinaturasPromocao = (
    <div className="break-inside-avoid px-4 pb-2 pt-4 sm:px-6">
      <h3 className="mb-3 text-center text-sm font-bold uppercase text-slate-900">Aprovações</h3>
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-12">
        {linhaDeAssinatura('gerente_1', 'Gerente da área')}
        {linhaDeAssinatura('rh', 'Recursos Humanos')}
        <div className="sm:col-span-2 sm:mx-auto sm:w-1/2">{linhaDeAssinatura('gerente_2', 'Gerente')}</div>
      </div>
      <p className="mt-3 text-right text-xs text-[#5b6870]">F.122/03</p>
    </div>
  );

  // Desligamento: a tabela do fim do check list.
  const caixaDaTabela = (etapa: Etapa, titulo: string, extra = '') => (
    <div className={`break-inside-avoid border border-[#26302b] ${extra}`}>
      <h4 className="border-b border-[#26302b] px-2 py-0.5 text-center text-sm font-bold uppercase text-slate-900">{titulo}</h4>
      <div className="p-2">{imagemDaAssinatura(etapa)}{detalhesDaAssinatura(etapa)}</div>
      <p className="pb-1 text-center text-xs text-[#5b6870]">{ordem(etapa)}</p>
    </div>
  );
  const assinaturasDesligamento = (
    <div className="px-4 pt-4 sm:px-6">
      <div className="grid sm:grid-cols-2 [&>*]:-mt-px sm:[&>*+*]:-ml-px">
        {caixaDaTabela('gerente_1', 'Assinatura do gestor')}
        {caixaDaTabela('gerente_2', 'Gerente de contrato')}
        {caixaDaTabela('rh', 'Assinatura Recursos Humanos', 'sm:col-span-2 sm:ml-0!')}
      </div>
    </div>
  );

  // Quadro de assinar: logo ABAIXO das assinaturas (17/11/2026). Na vez, já
  // aberto; fora da vez, o aviso de quem falta. Nunca vai para o papel.
  const quadroDeAssinar = pedido && pendente && (
    <section ref={quadroRef} id="ct-quadro-assinar" className="ct-sem-papel mt-4 space-y-3 rounded-2xl border-2 border-[#176b4d]/40 bg-emerald-50/40 p-4 print:hidden" aria-labelledby="ct-quadro-titulo" data-testid="barra-assinatura">
      {minhaVez ? (
        recusando ? (
          <>
            <h3 id="ct-quadro-titulo" className="text-base font-black text-slate-900">Recusar esta solicitação</h3>
            {falha && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{falha}</p>}
            <label htmlFor="ct-motivo-recusa" className="text-sm font-bold text-slate-900">Por que está recusando?</label>
            <textarea id="ct-motivo-recusa" rows={3} value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} className={`${CAMPO} py-2`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={ocupado || motivoRecusa.trim().length < 3} onClick={() => void recusar()} className={BOTAO_PERIGO_LEVE}>{ocupado ? 'Enviando…' : 'Confirmar recusa'}</button>
              <button type="button" disabled={ocupado} onClick={() => setRecusando(false)} className={BOTAO_SECUNDARIO}>Voltar para assinar</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id="ct-quadro-titulo" className="text-base font-black text-slate-900">Sua assinatura · {ordem(pendente)}</h3>
              <button type="button" onClick={() => { setFalha(''); setRecusando(true); }} className="min-h-11 px-1 text-sm font-semibold text-rose-700 underline underline-offset-4">Recusar</button>
            </div>
            {falha && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{falha}</p>}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-800">
                {tipo === 'promocao' && pendente === 'rh' ? 'Avaliação e comentários de Recursos Humanos (opcional)' : 'Comentário (opcional)'}
              </span>
              <textarea rows={2} value={comentario} onChange={e => setComentario(e.target.value)} maxLength={1000} className={`${CAMPO} py-2`} />
            </label>
            <QuadroAssinatura
              nome={leitor.nome}
              assinaturaSalva={assinaturaSalva}
              onApagarSalva={() => void apagarSalva()}
              rotuloConfirmar={ETAPAS.indexOf(pendente) === ETAPAS.length - 1 ? 'Assinar e concluir' : 'Assinar e enviar para a próxima'}
              ocupado={ocupado}
              onConfirmar={assinatura => void assinar(assinatura)}
            />
          </>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Clock3 className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p id="ct-quadro-titulo" role="status" className="text-sm font-semibold text-amber-900" data-testid="assinar-bloqueado">
            Aguardando a {ordem(pendente)}. Quando for a sua vez, o quadro para assinar aparece aqui.
          </p>
        </div>
      )}
    </section>
  );

  // Folha nova: primeiro escolhe o tipo, com 3 botões grandes.
  if (novo && !tipo) {
    return (
      <div className="mx-auto w-full max-w-[860px] space-y-4" data-testid="folha-contratacao" data-lancamento="">
        {onVoltar && <button type="button" onClick={onVoltar} className={BOTAO_SECUNDARIO}><ArrowLeft className="size-4" aria-hidden="true" /> Fechar</button>}
        <section className={`${CARTAO} p-5 sm:p-6`} aria-labelledby="ct-escolha">
          <h2 id="ct-escolha" className="text-xl font-black text-slate-900">O que você quer pedir?</h2>
          <p className="mt-1 text-sm text-[#5b6870]">Escolha uma opção. Depois é só preencher a folha e salvar.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ESCOLHAS.map(({ tipo: escolha, titulo, texto, Icone }) => (
              <button key={escolha} type="button" onClick={() => escolherTipo(escolha)} className={`${FOCO} flex min-h-28 flex-col items-start gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-[#176b4d] hover:bg-emerald-50/40`} data-testid={`escolher-${escolha}`}>
                <Icone className="size-6 text-[#176b4d]" aria-hidden="true" />
                <span className="text-base font-black text-slate-900">{titulo}</span>
                <span className="text-sm text-[#5b6870]">{texto}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-4" data-testid="folha-contratacao" data-lancamento={novo ? '' : undefined}>
      <div className="ct-sem-papel flex flex-wrap items-center gap-2.5 print:hidden">
        {onVoltar && <button type="button" onClick={onVoltar} className={BOTAO_SECUNDARIO}><ArrowLeft className="size-4" aria-hidden="true" /> {novo ? 'Fechar' : 'Voltar'}</button>}
        {novo && (
          <button type="button" onClick={() => setTipoNovo(null)} className={BOTAO_SECUNDARIO}>
            <BriefcaseBusiness className="size-4" aria-hidden="true" /> Trocar o tipo ({SOLICITACOES[tipo ?? 'contratacao']})
          </button>
        )}
        {!novo && (
          <button type="button" onClick={() => imprimir(tituloDoArquivo)} className={BOTAO_SECUNDARIO} data-testid="baixar-contratacao">
            <Printer className="size-4" aria-hidden="true" /> {concluido ? 'Baixar documento assinado (PDF)' : 'Imprimir ou salvar PDF'}
          </button>
        )}
        {onCopiarLink && pedido?.link_token && (
          <button type="button" onClick={onCopiarLink} className={BOTAO_SECUNDARIO} data-testid="copiar-link-folha">
            <Link2 className="size-4" aria-hidden="true" /> Copiar Link
          </button>
        )}
      </div>

      {/* Situação no topo, como em todo ERP: o que é, em que pé está e o que
          a pessoa precisa fazer agora. Não vai para o papel. */}
      {pedido && resumo && (() => {
        const recusada = pedido.status === 'recusada';
        const quemRecusou = pedido.rejected_stage && (ETAPAS as string[]).includes(pedido.rejected_stage) ? nomeDaEtapa(pedido.rejected_stage) : 'Gerência';
        const tom = minhaVez ? 'border-l-amber-500' : concluido ? 'border-l-[#176b4d]' : recusada ? 'border-l-rose-600' : 'border-l-slate-400';
        const Icone = minhaVez ? PenLine : concluido ? CheckCircle2 : recusada ? XCircle : Clock3;
        const corIcone = minhaVez ? 'text-amber-600' : concluido ? 'text-[#176b4d]' : recusada ? 'text-rose-700' : 'text-slate-500';
        const titulo = minhaVez ? 'Falta a sua assinatura'
          : concluido ? 'Documento assinado por todos'
            : recusada ? 'Solicitação recusada'
              : `Aguardando ${pendente ? CARGO_DA_ETAPA[pendente] : 'assinatura'}`;
        const texto = minhaVez && pendente ? `Confira os dados abaixo e assine em "Assinaturas". A sua é a ${ordem(pendente)}.`
          : concluido ? 'As 3 assinaturas foram feitas. Baixe o PDF para guardar.'
            : recusada ? `${quemRecusou}: ${pedido.rejection_reason || 'sem motivo escrito.'}`
              : `Você não precisa fazer nada agora. ${totalAssinado} de 3 assinaturas feitas.`;
        return (
          <section className={`ct-sem-papel ${CARTAO} overflow-hidden print:hidden`} aria-labelledby="ct-resumo" data-testid="resumo-solicitacao">
            <div className={`flex flex-wrap items-center gap-3 border-l-4 p-4 sm:p-5 ${tom}`}>
              <Icone className={`hidden size-7 shrink-0 sm:block ${corIcone}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#5b6870]">
                  <span className="tabular-nums">{pedido.request_number}</span> · {resumo.nomeDoTipo} · {resumo.pessoa}
                </p>
                <h1 id="ct-resumo" className="text-xl font-black text-slate-950 sm:text-2xl">{titulo}</h1>
                <p className={`text-sm ${recusada ? 'text-rose-900' : 'text-slate-700'}`}>{texto}</p>
              </div>
              {minhaVez && (
                <a href="#ct-quadro-assinar" onClick={evento => { evento.preventDefault(); quadroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`} data-testid="ir-assinar">
                  <PenLine className="size-4" aria-hidden="true" /> Assinar agora
                </a>
              )}
              {concluido && (
                <button type="button" onClick={() => imprimir(tituloDoArquivo)} className={`${BOTAO_PRIMARIO} w-full sm:w-auto`}>
                  <Printer className="size-4" aria-hidden="true" /> Baixar PDF
                </button>
              )}
            </div>
          </section>
        );
      })()}

      {novo && falha && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{falha}</p>}
      {novo && errosNoEnvio && totalErros > 0 && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          Falta preencher {totalErros === 1 ? '1 campo' : `${totalErros} campos`}. Eles estão marcados em vermelho.
        </p>
      )}

      {pedido && <ResumoDoPedido form={pedido.form} />}
      {pedido && (
        <section className={`${CARTAO} p-4 sm:p-5`} aria-labelledby="ct-assinaturas" data-testid="assinaturas-do-pedido">
          <h2 id="ct-assinaturas" className="mb-3 text-base font-black text-slate-900">Assinaturas</h2>
          <ListaDeAssinaturas pedido={pedido} />
          {listaDeComentarios && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="mb-1 text-xs font-semibold text-[#5b6870]">Comentários de quem assinou</p>{listaDeComentarios}</div>}
          {quadroDeAssinar}
        </section>
      )}

      {novo ? (
        <article ref={folhaRef} className="ct-imprimir overflow-hidden rounded-2xl border border-slate-200 bg-white pb-2" data-testid="documento-contratacao" data-tipo={tipo}>
          <CabecalhoPapel codigo={documento.codigo} titulo={documento.titulo} />
          {pedido && <p className="px-4 pt-2 text-right text-sm font-semibold text-slate-800 sm:px-6">Nº <span className="tabular-nums">{pedido.request_number}</span></p>}

          <fieldset disabled={novo && ocupado} className="contents">
            {tipo === 'promocao' && <CorpoPromocao {...corpo} avaliacaoRh={avaliacaoDoRh ? <p className="whitespace-pre-line text-sm text-slate-900">{avaliacaoDoRh}</p> : <p className="text-sm text-[#5b6870]">{novo ? 'O RH escreve aqui quando assinar.' : '—'}</p>} />}
            {tipo === 'desligamento' && <CorpoDesligamento {...corpo} />}
            {tipo === 'contratacao' && <CorpoContratacao {...corpo} alternarItem={alternarItem} />}
          </fieldset>

          {tipo === 'contratacao' && assinaturasContratacao}
          {tipo === 'promocao' && assinaturasPromocao}
          {tipo === 'desligamento' && assinaturasDesligamento}


          {tipo === 'desligamento' && (
            <div className="px-4 pb-4 sm:px-6">
              <section className="break-inside-avoid border border-[#26302b]" aria-labelledby="ct-comentarios-deslig">
                <h4 id="ct-comentarios-deslig" className="border-b border-[#26302b] text-center text-sm font-bold uppercase text-slate-900">Comentários</h4>
                <div className="min-h-24 p-2">{listaDeComentarios || <p className="text-sm text-[#5b6870]">{novo ? 'Quem assinar pode deixar um comentário aqui.' : '—'}</p>}</div>
              </section>
            </div>
          )}
          {!novo && (
            // Sem "Histórico" (18/11/2026, pedido do Deivid): quem assinou e
            // quando já aparece em cada assinatura. Fica só o código de conferência.
            <Bloco>
              <p className="text-xs text-[#5b6870]">
                {SITUACOES[pedido.status] ?? pedido.status} · código de conferência dos dados <strong className="font-mono text-slate-700">{pedido.form_hash.slice(0, 12).toUpperCase()}</strong>. As assinaturas valem para estes dados. Emitido no {PRODUTO.nome} para {CLIENTE.nome}.
              </p>
            </Bloco>
          )}
        </article>
      ) : (
        <details ref={documentoRef} className="group rounded-2xl border border-slate-200 bg-white" data-testid="documento-completo">
          <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 text-sm font-bold text-slate-800 hover:text-[#176b4d] sm:px-5 ${FOCO}`}>
            <span className="flex items-center gap-2"><FileText className="size-4 text-[#176b4d]" aria-hidden="true" /> Ver o documento completo (igual ao PDF)</span>
            <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-slate-200 p-2 sm:p-3">
            <article ref={folhaRef} className="ct-imprimir overflow-hidden rounded-2xl border border-slate-200 bg-white pb-2" data-testid="documento-contratacao" data-tipo={tipo}>
              <CabecalhoPapel codigo={documento.codigo} titulo={documento.titulo} />
              {pedido && <p className="px-4 pt-2 text-right text-sm font-semibold text-slate-800 sm:px-6">Nº <span className="tabular-nums">{pedido.request_number}</span></p>}

              <fieldset disabled={novo && ocupado} className="contents">
                {tipo === 'promocao' && <CorpoPromocao {...corpo} avaliacaoRh={avaliacaoDoRh ? <p className="whitespace-pre-line text-sm text-slate-900">{avaliacaoDoRh}</p> : <p className="text-sm text-[#5b6870]">{novo ? 'O RH escreve aqui quando assinar.' : '—'}</p>} />}
                {tipo === 'desligamento' && <CorpoDesligamento {...corpo} />}
                {tipo === 'contratacao' && <CorpoContratacao {...corpo} alternarItem={alternarItem} />}
              </fieldset>

              {tipo === 'contratacao' && assinaturasContratacao}
              {tipo === 'promocao' && assinaturasPromocao}
              {tipo === 'desligamento' && assinaturasDesligamento}


              {tipo === 'desligamento' && (
                <div className="px-4 pb-4 sm:px-6">
                  <section className="break-inside-avoid border border-[#26302b]" aria-labelledby="ct-comentarios-deslig">
                    <h4 id="ct-comentarios-deslig" className="border-b border-[#26302b] text-center text-sm font-bold uppercase text-slate-900">Comentários</h4>
                    <div className="min-h-24 p-2">{listaDeComentarios || <p className="text-sm text-[#5b6870]">{novo ? 'Quem assinar pode deixar um comentário aqui.' : '—'}</p>}</div>
                  </section>
                </div>
              )}
              {!novo && (
                // Sem "Histórico" (18/11/2026, pedido do Deivid): quem assinou e
                // quando já aparece em cada assinatura. Fica só o código de conferência.
                <Bloco>
                  <p className="text-xs text-[#5b6870]">
                    {SITUACOES[pedido.status] ?? pedido.status} · código de conferência dos dados <strong className="font-mono text-slate-700">{pedido.form_hash.slice(0, 12).toUpperCase()}</strong>. As assinaturas valem para estes dados. Emitido no {PRODUTO.nome} para {CLIENTE.nome}.
                  </p>
                </Bloco>
              )}
            </article>
          </div>
        </details>
      )}

      {novo && (
        <div className="ct-sem-papel flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void salvar()} disabled={ocupado} className={BOTAO_PRIMARIO} data-testid="salvar-contratacao">
            {ocupado ? 'Salvando…' : 'Salvar e gerar link'}
          </button>
          <p className="text-sm text-[#5b6870]">
            Ao salvar, o sistema gera um link só deste pedido. Mande o link para as 3 assinaturas, nesta ordem: {ETAPAS.map((etapa, i) => `${i + 1}. ${CARGO_DA_ETAPA[etapa]}`).join(', ')}.
          </p>
        </div>
      )}
    </div>
  );
}

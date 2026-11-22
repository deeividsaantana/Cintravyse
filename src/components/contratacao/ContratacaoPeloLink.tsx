import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, FileText, ListChecks, PenLine } from 'lucide-react';
import { SOLICITACOES, emAberto, podeDecidir, resumoDoPedido } from '../../../api/_shared/contratacao-regras.js';
import { AbasDaTela, idDaAba } from '../../shared/ui/AbasDaTela';
import { BOTAO_SECUNDARIO, CARTAO, FOCO } from '../cadastros/estilos';
import { carregarContratacoes, carregarPeloLink, type DadosDoLink, type Leitor, type PedidoContratacao, type TipoSolicitacao } from '../../services/contratacaoApi';
import { FolhaContratacao } from './FolhaContratacao';
import { SeloSituacaoContratacao } from './SeloSituacaoContratacao';
import { dataBr } from './formatos';

/** Cartão no centro da tela, no mesmo jeito da entrada do link de presença. */
function Aviso({ titulo, texto, tom = 'neutro', children }: { titulo: string; texto: string; tom?: 'neutro' | 'erro'; children?: ReactNode }) {
  const Icone = tom === 'erro' ? AlertCircle : CheckCircle2;
  return (
    <section className="flex min-h-[40dvh] items-center justify-center" aria-labelledby="ct-link-aviso">
      <div className={`${CARTAO} w-full max-w-md p-6 text-center shadow-sm sm:p-8`} data-testid="contratacao-link-aviso">
        <Icone className={`mx-auto mb-4 size-10 ${tom === 'erro' ? 'text-rose-700' : 'text-[#176b4d]'}`} aria-hidden="true" />
        <h1 id="ct-link-aviso" className="mb-2 text-2xl font-black text-slate-950">{titulo}</h1>
        <p className="text-sm text-slate-600">{texto}</p>
        {children}
      </div>
    </section>
  );
}

type Subaba = 'falta' | 'assinar' | 'todas';
type Filtro = 'todos' | TipoSolicitacao;

/** Filtro por tipo, em botões grandes: Todos, Contratação, Promoção, Desligamento. */
function FiltroDeTipo({ filtro, onFiltro, contar }: { filtro: Filtro; onFiltro: (f: Filtro) => void; contar: (f: Filtro) => number }) {
  // Só os tipos que existem na lista: botão com (0) é ruído.
  const opcoes: Array<[Filtro, string]> = [['todos', 'Todos'], ...(Object.entries(SOLICITACOES) as Array<[TipoSolicitacao, string]>).filter(([valor]) => valor === filtro || contar(valor) > 0)];
  if (opcoes.length <= 2) return null;
  return (
    <div role="group" aria-label="Filtrar por tipo" className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {opcoes.map(([valor, nome]) => (
        <button
          key={valor}
          type="button"
          aria-pressed={filtro === valor}
          onClick={() => onFiltro(valor)}
          className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition ${filtro === valor ? 'border-[#176b4d] bg-[#176b4d] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'} ${FOCO}`}
        >
          {nome} <span className="tabular-nums opacity-80">({contar(valor)})</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Uma linha da lista, no jeito de lista de documentos de ERP: ícone de folha,
 * número e tipo em cima, pessoa e data embaixo; à direita, a situação ou o
 * botão "Assinar". Tocar abre a folha.
 */
function LinhaDoPedido({ pedido, vez, onAbrir }: { pedido: PedidoContratacao; vez: boolean; onAbrir: () => void }) {
  const resumo = resumoDoPedido(pedido.form);
  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50/30 ${vez ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'} ${FOCO}`}
      >
        <span className="hidden size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white sm:grid" aria-hidden="true">
          <FileText className={`size-5 ${vez ? 'text-amber-700' : 'text-[#176b4d]'}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-slate-900 sm:text-sm">{resumo.nomeDoTipo} <span className="text-xs font-semibold tabular-nums text-[#5b6870]">{pedido.request_number}</span></span>
          <span className="block text-sm text-slate-800 [overflow-wrap:anywhere]">{resumo.pessoa}<span className="hidden sm:inline">{resumo.cargo ? ` · ${resumo.cargo}` : ''}</span></span>
          <span className="block text-xs text-[#5b6870]">Pedido em {dataBr(pedido.form.data)} por {pedido.requester_name}</span>
          {!vez && <span className="mt-1 block sm:hidden"><SeloSituacaoContratacao situacao={pedido.status} /></span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {vez
            ? <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#176b4d] px-3 text-sm font-bold text-white"><PenLine className="size-4" aria-hidden="true" /> Assinar</span>
            : <span className="hidden sm:inline-flex"><SeloSituacaoContratacao situacao={pedido.status} /></span>}
          <ChevronRight className="size-4 text-[#5b6870]" aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

/**
 * Link dos documentos (/contratacao-link/<token>), com 3 subabas (18/11/2026):
 * "Falta assinar" (só o que espera a assinatura da pessoa, com filtro por
 * tipo), "Assinar" (o documento aberto e o quadro de assinar) e "Todas" (tudo
 * o que ela pode ver, inclusive encerradas). O login já foi pedido antes; o
 * servidor diz se o link vale e quem vê o quê.
 */
export function ContratacaoPeloLink({ token }: { token: string }) {
  const [dados, setDados] = useState<DadosDoLink | null>(null);
  const [erro, setErro] = useState('');
  const [todos, setTodos] = useState<PedidoContratacao[] | null>(null);
  const [subaba, setSubaba] = useState<Subaba | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [link, lista] = await Promise.all([
        carregarPeloLink(token),
        // A lista é um atalho: se falhar, o pedido do link segue normal.
        carregarContratacoes().then(resposta => resposta.requests).catch(() => null),
      ]);
      setDados(link);
      setTodos(lista);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o link.');
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const leitor: Leitor | null = dados?.me ?? null;
  const doLink = dados && 'request' in dados ? dados.request : null;
  // Todos os pedidos que a pessoa vê; o do link entra mesmo se a lista falhar.
  const pedidos = useMemo(() => {
    const lista = todos ?? [];
    return doLink && !lista.some(p => p.id === doLink.id) ? [doLink, ...lista] : lista;
  }, [todos, doLink]);
  const minhaVez = useCallback((p: PedidoContratacao) => (leitor ? podeDecidir(p, p.signatures, leitor) : false), [leitor]);
  const falta = pedidos.filter(minhaVez);

  // Abre em "Assinar" quando o pedido do link é da vez da pessoa; senão em "Falta assinar".
  // Sem nada para assinar, abre em "Todas" para a tela não começar vazia.
  const ativa: Subaba = subaba ?? (doLink && minhaVez(doLink) ? 'assinar' : falta.length > 0 ? 'falta' : 'todas');
  const aberto = pedidos.find(p => p.id === (abertoId ?? doLink?.id)) ?? null;

  if (erro) {
    return (
      <Aviso titulo="Não deu para abrir" texto={erro} tom="erro">
        <button type="button" onClick={() => { setErro(''); void carregar(); }} className={`${BOTAO_SECUNDARIO} mt-6 w-full`}>Tentar de novo</button>
      </Aviso>
    );
  }
  if (!dados || !leitor) return <p className="p-6 text-sm text-[#5b6870]" role="status">Abrindo a solicitação…</p>;

  const abrir = (p: PedidoContratacao) => { setAbertoId(p.id); setSubaba('assinar'); window.scrollTo({ top: 0 }); };
  const doTipo = (lista: PedidoContratacao[], f: Filtro) => (f === 'todos' ? lista : lista.filter(p => resumoDoPedido(p.form).tipo === f));
  const ordenadas = [...pedidos].sort((a, b) => Number(minhaVez(b)) - Number(minhaVez(a)) || Number(emAberto(b.status)) - Number(emAberto(a.status)));

  const lista = (itens: PedidoContratacao[], vazio: string) => (itens.length === 0
    ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{vazio}</p>
    : <ul className="space-y-2">{itens.map(p => <LinhaDoPedido key={p.id} pedido={p} vez={minhaVez(p)} onAbrir={() => abrir(p)} />)}</ul>);

  const subabas = [
    { id: 'falta' as const, rotulo: 'Falta assinar', icone: ListChecks, contador: falta.length, contadorRotulo: 'esperando a sua assinatura' },
    { id: 'assinar' as const, rotulo: 'Assinar', icone: PenLine },
    { id: 'todas' as const, rotulo: 'Todas', icone: FileText, contador: pedidos.length, contadorRotulo: 'solicitações', tom: 'neutro' as const },
  ];

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <AbasDaTela<Subaba> id="ct-link" rotulo="Subabas do link dos documentos" abas={subabas} ativa={ativa} onTrocar={id => setSubaba(id)} idPainel="ct-link-painel" testId="ct-link-aba" className="mb-4 print:hidden" />
      <div id="ct-link-painel" role="tabpanel" aria-labelledby={idDaAba('ct-link', ativa)}>
        {ativa === 'falta' && (
          <section className={`${CARTAO} p-4 sm:p-5`} data-testid="ct-link-falta">
            <h2 className="mb-3 text-base font-black text-slate-900">Esperando a sua assinatura</h2>
            <FiltroDeTipo filtro={filtro} onFiltro={setFiltro} contar={f => doTipo(falta, f).length} />
            {lista(doTipo(falta, filtro), filtro === 'todos' ? 'Nada esperando a sua assinatura agora.' : `Nenhuma ${SOLICITACOES[filtro].toLowerCase()} esperando a sua assinatura.`)}
          </section>
        )}
        {ativa === 'todas' && (
          <section className={`${CARTAO} p-4 sm:p-5`} data-testid="ct-link-todas">
            <h2 className="mb-3 text-base font-black text-slate-900">Todas as solicitações</h2>
            <FiltroDeTipo filtro={filtro} onFiltro={setFiltro} contar={f => doTipo(pedidos, f).length} />
            {lista(doTipo(ordenadas, filtro), 'Nenhuma solicitação deste tipo.')}
          </section>
        )}
        {ativa === 'assinar' && (aberto ? (
          <FolhaContratacao
            key={`${aberto.id}-${aberto.version}`}
            pedido={aberto}
            leitor={leitor}
            token={aberto.id === doLink?.id ? token : aberto.link_token ?? undefined}
            onAtualizado={() => void carregar()}
          />
        ) : dados.expirado ? (
          dados.expirado === 'recusada'
            ? <Aviso titulo="Link encerrado" texto={'Este link foi encerrado. A solicitação foi recusada. Veja as outras em "Falta assinar".'} tom="erro" />
            : <Aviso titulo="Link expirado" texto={'Este link expirou: a solicitação já foi assinada por todas as partes. Veja as outras em "Falta assinar".'} />
        ) : (
          <Aviso titulo="Escolha uma solicitação" texto={'Abra uma solicitação em "Falta assinar" para ver o documento e assinar.'} />
        ))}
      </div>
    </div>
  );
}

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from './styles';
import { useDentroDaTelaCheia } from './TelaCheia';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Subtelas (AbasDaTela), logo depois do título e antes das ações. */
  abas?: ReactNode;
  className?: string;
  /** Mantido por compatibilidade com telas antigas; não é exibido no cabeçalho. */
  eyebrow?: string;
  /** Esconde o título visual quando há subtelas (as abas já identificam a tela). */
  compact?: boolean;
  /** Título só para leitor de tela: a tela já é identificada pelo menu (Painel). */
  tituloOculto?: boolean;
}

/**
 * Exibe o título (h1) e a descrição do módulo, visíveis para todos os
 * usuários, as subtelas da aba (quando houver) e a barra de ações. Dentro da
 * TelaCheia é a faixa fixa do topo: título curto, abas ao lado e a ação
 * principal à direita, numa linha só quando couber. No computador essa linha
 * sobe para a barra do topo, no lugar do "Projeto atual" (index.css,
 * "Cabeçalho na barra do topo"). Dentro da área de dados
 * de outra TelaCheia (subtela que é uma tela inteira) o título vira h2.
 */
export function PageHeader({ title, description, actions, abas, className, compact = true, tituloOculto = false }: PageHeaderProps) {
  const Titulo = useDentroDaTelaCheia() ? 'h2' : 'h1';
  const linhaDoTopo = useLinhaDoTopo();
  // Sem subtelas, o lado esquerdo ficaria vazio: o título aparece, como no
  // Painel de Controle. Com subtelas, as abas já dizem onde a pessoa está.
  const escondeTitulo = tituloOculto || (compact && Boolean(abas));
  // Nada à vista (Painel): a barra do topo segue mostrando o projeto atual.
  const vazio = escondeTitulo && !abas && !actions;
  return (
    <header ref={linhaDoTopo} className={cn('renea-page-header', escondeTitulo ? 'renea-page-header--compact' : undefined, abas ? 'renea-page-header--com-abas' : undefined, vazio ? 'renea-page-header--vazio' : undefined, className)}>
      <div className="renea-page-header__copy">
        <span className={escondeTitulo ? 'sr-only' : undefined}>
          <Titulo>{title}</Titulo>
          {description && <p>{description}</p>}
        </span>
      </div>
      {abas && <div className="renea-page-header__abas">{abas}</div>}
      {actions && <div className="renea-page-toolbar renea-page-actions">{actions}</div>}
    </header>
  );
}

/**
 * O que passa por cima do recuo da direita (onde ficam o sino e a pessoa) não
 * conta como transbordo para o scrollWidth, então a conta é feita à mão.
 */
function cabe(cabecalho: HTMLElement) {
  const limite = cabecalho.getBoundingClientRect().right - (parseFloat(getComputedStyle(cabecalho).paddingRight) || 0);
  const fim = Math.max(...Array.from(cabecalho.children, filho => filho.getBoundingClientRect().right));
  return fim <= limite + 1;
}

/** Passos de aperto, do mais leve ao último recurso (index.css, "Cabeçalho na barra do topo"). */
const APERTOS = 4;

/**
 * No computador o cabeçalho sobe para a barra do topo e fica sempre numa
 * linha só (pedido de 16/11/2026). Quando não cabe ao lado do canto direito
 * da barra (salvamento, sino e pessoa), aperta aos poucos e para no primeiro
 * passo que cabe: 1 esconde o nome da pessoa (fica a foto); 2 tira os ícones
 * das abas e deixa só o ícone nos botões secundários; 3 usa o nome curto das
 * abas; 4 as abas rolam de lado dentro da própria faixa. A conta parte sempre
 * do passo 0, então o resultado não fica trocando sozinho.
 */
function useLinhaDoTopo() {
  const ref = useRef<HTMLElement>(null);
  // O que foi medido por último. A conta força o navegador a refazer o
  // layout (até 5 vezes); refeita a cada render, deixava a troca de subtela
  // e o Quadro lentos (24/11/2026). Agora só mede quando o texto do topo, o
  // número de itens ou a largura da janela mudam.
  const medido = useRef('');

  useLayoutEffect(() => {
    const cabecalho = ref.current;
    const barra = document.querySelector<HTMLElement>('.erp-workspace > .erp-topbar');
    marcarTopoNaBarra(cabecalho, Boolean(cabecalho && barra && cabecalhoDaRaiz(cabecalho)));
    if (!cabecalho || !barra || !topoSobe(cabecalho)) {
      cabecalho?.removeAttribute('data-aperto');
      medido.current = '';
      return;
    }
    const assinatura = `${window.innerWidth}|${cabecalho.childElementCount}|${cabecalho.getElementsByTagName('*').length}|${cabecalho.textContent}`;
    if (assinatura === medido.current) return;
    medido.current = assinatura;
    // Topo que já foi medido nesta visita (voltar a uma subtela): aplica o
    // passo guardado, sem medir de novo.
    const guardado = PASSO_DO_TOPO.get(assinatura);
    if (guardado !== undefined) aplicarPasso(cabecalho, barra, guardado);
    else PASSO_DO_TOPO.set(assinatura, medirLinhaDoTopo(cabecalho, barra));
  });

  useLayoutEffect(() => {
    const cabecalho = ref.current;
    const barra = document.querySelector<HTMLElement>('.erp-workspace > .erp-topbar');
    if (!cabecalho || !barra || typeof ResizeObserver === 'undefined') return undefined;
    // Observa a barra do topo (largura fixa), não o cabeçalho: o cabeçalho
    // muda de tamanho com a própria medida e mediria de novo a cada troca.
    let largura = Math.round(barra.getBoundingClientRect().width);
    const observador = new ResizeObserver(() => {
      const nova = Math.round(barra.getBoundingClientRect().width);
      if (nova === largura) return;
      largura = nova;
      PASSO_DO_TOPO.clear();
      if (medido.current && topoSobe(cabecalho)) PASSO_DO_TOPO.set(medido.current, medirLinhaDoTopo(cabecalho, barra));
    });
    observador.observe(barra);
    return () => {
      observador.disconnect();
      delete document.documentElement.dataset.topoApertado;
    };
  }, []);

  useLayoutEffect(() => {
    const cabecalho = ref.current;
    return () => marcarTopoNaBarra(cabecalho, false);
  }, []);

  return ref;
}

function cabecalhoDaRaiz(cabecalho: HTMLElement) {
  return Boolean(cabecalho.closest('.renea-tela-cheia--raiz > .renea-tela-cheia__topo'))
    && !cabecalho.classList.contains('renea-page-header--vazio');
}

function topoSobe(cabecalho: HTMLElement) {
  return cabecalhoDaRaiz(cabecalho) && window.matchMedia('(min-width: 1024px)').matches;
}

/**
 * Marca no <html> (data-topo-na-barra) que há um cabeçalho de aba subindo
 * para a barra do topo. O CSS lia isso com `.erp-workspace:has(...)`, e o
 * navegador refazia essa conta a cada mudança na tela: a troca de subtela
 * chegava a levar quase 1 s no celular (25/11/2026).
 */
const CABECALHOS_NA_BARRA = new Set<HTMLElement>();
function marcarTopoNaBarra(cabecalho: HTMLElement | null, sobe: boolean) {
  if (!cabecalho) return;
  if (sobe) CABECALHOS_NA_BARRA.add(cabecalho);
  else CABECALHOS_NA_BARRA.delete(cabecalho);
  const raiz = document.documentElement;
  if (CABECALHOS_NA_BARRA.size > 0) {
    if (!raiz.hasAttribute('data-topo-na-barra')) raiz.setAttribute('data-topo-na-barra', '');
  } else if (raiz.hasAttribute('data-topo-na-barra')) raiz.removeAttribute('data-topo-na-barra');
}

const PASSO_DO_TOPO = new Map<string, number>();

function aplicarPasso(cabecalho: HTMLElement, barra: HTMLElement, passo: number) {
  // Só escreve o que muda: mexer no <html> refaz o estilo da página inteira
  // (com uma tabela grande, cada escrita custava dezenas de ms).
  const raiz = document.documentElement;
  if (cabecalho.dataset.aperto !== String(passo)) cabecalho.dataset.aperto = String(passo);
  const apertado = passo >= 1;
  if (apertado !== ('topoApertado' in raiz.dataset)) {
    if (apertado) raiz.dataset.topoApertado = '';
    else delete raiz.dataset.topoApertado;
  }
  const acoesDaBarra = barra.querySelector<HTMLElement>('.erp-topbar__actions');
  const largura = acoesDaBarra ? `${Math.ceil(acoesDaBarra.getBoundingClientRect().width)}px` : '';
  if (largura && raiz.style.getPropertyValue('--renea-topo-direita') !== largura) raiz.style.setProperty('--renea-topo-direita', largura);
}

/** Aperta passo a passo até caber; devolve o passo que ficou. */
function medirLinhaDoTopo(cabecalho: HTMLElement, barra: HTMLElement) {
  for (let passo = 0; passo <= APERTOS; passo += 1) {
    aplicarPasso(cabecalho, barra, passo);
    if (cabe(cabecalho)) return passo;
  }
  return APERTOS;
}

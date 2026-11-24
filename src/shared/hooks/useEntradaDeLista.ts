import { useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * Cascata curta nas linhas de uma lista ou tabela operacional.
 *
 * O padrão nasceu no painel e no controle de frota e se repetiu em quase toda
 * tela de conferência, então vira hook em vez de cópia. A animação é de
 * entrada apenas: quem opera a mesma tela o dia inteiro não pode esperar meio
 * segundo a cada filtro, por isso o passo é de 20ms e a duração de 300ms.
 *
 * Só mexe em transform, que não força novo layout, e devolve o
 * estado natural no fim (`clearProps`) para não competir com os
 * estilos da própria tela. Com `prefers-reduced-motion` nada é animado: a
 * lista já nasce visível porque nenhum estado inicial chega a ser aplicado.
 *
 * Marque as linhas com `data-linha-lista` e ligue o ref devolvido ao elemento
 * que envolve a lista.
 */
export const useEntradaDeLista = <T extends HTMLElement = HTMLDivElement>(
  dependencias: unknown[] = [],
): RefObject<T | null> => {
  const escopo = useRef<T>(null);

  useGSAP(() => {
    const raiz = escopo.current;
    if (!raiz || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Só as primeiras linhas deslizam, e nenhuma começa invisível (24/11/2026):
    // com 200 linhas a cascata deixava a última escondida por 4 segundos e a
    // lista parecia travada.
    const linhas = Array.from(raiz.querySelectorAll('[data-linha-lista]')).slice(0, 12);
    if (!linhas.length) return;

    gsap.fromTo(
      linhas,
      { y: 6 },
      {
        y: 0,
        duration: 0.18,
        stagger: 0.012,
        ease: 'power2.out',
        clearProps: 'transform',
      },
    );
  }, { scope: escopo, dependencies: dependencias });

  return escopo;
};

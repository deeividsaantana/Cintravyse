# Padrão do site Cintravyse

Regra de ouro: **toda aba é igual**. Quem aprendeu uma aba sabe usar todas.
Visual de app premium, mas ERP simples: muito espaço, letra limpa, poucas cores, nenhum enfeite.
Se uma tela não segue este guia, ela não entra.

Versão 1, 23/11/2026. Aprovado pelo Deivid no mapa `padrao-abas/mapa-antes-depois.png`.

---

## 1. Menu lateral

| Grupo | Abas |
|---|---|
| (topo) | Visão geral |
| Operação | Pluviômetro, Programação, Controle de Estacas |
| Frota | Frotas e Manutenção, Combustível |
| Compras | Solicitações e Compras |
| Pessoas | Presença, Contratação |
| Administração | Cadastros, Dev |

- Cada coisa mora **num lugar só**. Cadastro (pessoa, equipe, máquina, empresa) só em **Cadastros**. Quem pode o quê (acessos, quem assina, quem aprova) só no **Dev**.
- Nada de aba nova no menu sem passar por este guia.

## 2. Topo da aba (uma linha só)

```
[Opção 1] [Opção 2] [Opção 3] [Relatórios] [Ver: ▾]        [⋮] [+ Ação principal]
```

1. **No máximo 4 opções.** **Relatórios é sempre a última** (quando a aba tem relatório).
2. **Nada de segunda fileira de abas ou de botões.** Se uma opção tem mais de uma tela (ex.: Relatórios → Resumo, Histórico), a escolha aparece numa caixinha **"Ver"** ao lado, na mesma linha.
3. **Lançar nunca é aba.** É o **botão principal** (verde, à direita, com a tecla **N**) e abre em tela cheia.
4. Coisa rara (importar planilha, lixeira, link, planilha de compras, motoristas) fica no **⋮ Mais ações**, à esquerda do botão principal.
5. Nomes curtos e iguais em todo o site: **Lançamentos** (lista do que foi lançado), **Relatórios**, **Histórico**, **Pedidos**. Nada de nome técnico.

Componentes: `TelaCheia` + `PageHeader` + `AbasDaTela` + `MaisAcoes`.

## 3. Busca e filtros (linha logo abaixo do topo)

```
[🔍 Buscar…                ] [Filtro principal ▾] [Filtros (2)]          [Excel] [PDF]
```

- Sempre **uma busca + um filtro** à vista. O resto vai no botão **Filtros**, com o número de filtros ligados.
- Excel e PDF à direita. PDF sempre numa **folha A4 só**, sem endereço do site.
- Filtro ou contador com zero não aparece.

## 4. Tabelas e cartões

- **Computador:** `TabelaPadrao`. Cabeçalho fixo, uma linha por registro, texto numa linha só (partes separadas por "·"), números alinhados à direita.
- **Celular:** a mesma lista vira **cartões**, com os mesmos campos na mesma ordem.
- Tocar na linha abre a ficha. A ficha e a edição abrem em **tela cheia, com fundo branco**, e **Ctrl+S** salva.
- Cartão: fundo branco, borda cinza fina, canto de 16 px, sem sombra pesada, sem fundo colorido.
- Números de resumo só quando ajudam a decidir, no máximo 4, pequenos, na linha do topo. Nada de fileira de cartões grandes.

## 5. Cores e tamanhos

| Uso | Valor |
|---|---|
| Fundo das telas | branco `#ffffff` |
| Ação principal e aba aberta | verde `#176b4d` |
| Texto | quase preto `#0f172a`; secundário cinza `#5b6870` |
| Borda | cinza claro `#e2e8f0` |
| Pede atenção | laranja `#c2410c` (selo com número) |
| Erro | vermelho `rose-700` |

- Letra: mínimo 12 px; texto normal 14 px; título da tela 16 a 18 px em negrito.
- Botões e campos: altura mínima 44 px (toque fácil), canto 12 px.
- Espaço: 16 px entre blocos, 24 px nas bordas da tela. Respiro é premium; aperto não é.
- Ícone só quando ajuda a reconhecer. Sem emoji, sem gradiente, sem animação chamativa. Entrada da tela: só um deslizar curto, **nunca** começa invisível.

## 6. Avisos

- **Nenhum aviso flutuante (toast) nem sino.** O resultado aparece na própria tela (a linha nova na lista, o campo com erro em vermelho).
- Erro diz o que fazer: "Falta a data. Escolha o dia." e não "Erro 400".
- Apagar pede confirmação numa caixa clara. Apagar de vez só o dono.

## 7. Celular (390 px)

- Nada sai da tela de lado. Nunca.
- O topo vira: opções roláveis numa faixa + botão principal com largura cheia logo abaixo.
- Tabela vira cartão. Formulário em uma coluna. Botão Salvar fixo no pé da tela.
- Conferir sempre com print em 390 px e no computador (1366 px) antes de dar a tela por pronta.

## 8. Checklist de toda tela nova ou alterada

- [ ] Até 4 opções no topo, Relatórios por último, sem segunda fileira
- [ ] Lançar é botão (tecla N), não aba
- [ ] Busca + 1 filtro + Filtros; Excel/PDF à direita
- [ ] Nada repetido em outra aba
- [ ] Tabela no PC, cartões no celular; ficha em tela cheia branca
- [ ] Sem toast, sem sino, sem cartão colorido
- [ ] Prints em 390 px e no computador
- [ ] Uma pessoa cansada entende na hora?

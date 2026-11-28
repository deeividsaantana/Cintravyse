Antes:

Depois:

Como:

## Checklist (ver CONTRIBUTING.md)

- [ ] `npm run verify` passou
- [ ] Um assunto só neste PR
- [ ] Nenhum registro some e nenhum dado ausente vira zero ou status inventado
- [ ] Nenhum segredo, arquivo solto na raiz ou código comentado

### Se mexeu em tela

- [ ] Uma pessoa cansada e sem facilidade com aplicativos consegue usar sem travar
- [ ] O visual bate com o Painel de Controle (PageHeader, cartões, paleta, foco, GSAP)
- [ ] A aba usa o molde TelaCheia (100% da largura e da altura, só a área de dados rola) e subtelas com AbasDaTela
- [ ] Abas ocultas que usam a mesma tela foram conferidas
- [ ] Skills de design usadas (CONTRIBUTING.md, seção 7)
- [ ] Prints no celular (390 px) e no computador anexados

### Alteração de padrão aprovada (obrigatório SOMENTE se mexeu em standards/, scripts/check-*.mjs, .github/ ou AGENTS.md)

- [ ] A mudança não afrouxa travas de segurança, multi-tenant, RLS ou integridade de dados
- [ ] A justificativa arquitetural e o plano de migração foram descritos acima
- [ ] Aprovação explícita do dono do produto (`@deeividsaantana`) solicitada via CODEOWNERS

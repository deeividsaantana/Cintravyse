# Padrão Único do Cintravyse ERP (Bloqueio Rígido)

Este documento define o **padrão único transversal** do webapp — cobrindo **Frontend/UI, Arquitetura, Backend/Segurança, Banco de Dados e Repositório** — com **bloqueio automático** no `npm run verify`, no hook local `git pre-push`, no GitHub Actions CI e no checklist obrigatório de Pull Request.

---

## 1. Stack Oficial Travada (`STACK-DEP`, `STACK-CORE`, `STACK-UI`, `STACK-DEPLOY`)

- **Frontend:** Vite + React + TypeScript (`tsconfig.json`, alias `@/*` -> `./src/*`)
- **UI:** Tailwind CSS 4 + **shadcn/ui** (`components.json`, `src/lib/utils.ts`, primitivos em `src/components/ui/*`, ícones `lucide-react`)
- **Validação:** **Zod** + **React Hook Form** (`@hookform/resolvers`)
- **Data Fetching:** **TanStack Query** (`@tanstack/react-query`)
- **Deploy:** **Render** (`render.yaml`, `server/index.js`, `api/*` + Supabase PostgreSQL/Auth/Storage)

Qualquer dependência adicionada em `package.json` fora da lista aprovada em `standards/erp-standards.lock.json` bloqueia automaticamente `npm run verify`, `git pre-push` e CI.

## 2. Como o Bloqueio Funciona (3 Camadas)

1. **Bloqueio local automático (`git pre-push` → `npm run verify`):** ninguém envia código fora do padrão.
2. **Bloqueio de CI (`.github/workflows/ci.yml` + `npm run check:standards`):** toda PR/push valida stack, arquitetura, CSS, segurança, migrations e higiene antes de merge.
3. **Meta-Bloqueio contra mudar o próprio padrão:**
   - As regras, stack e tetos ficam congelados em [`standards/erp-standards.lock.json`](../standards/erp-standards.lock.json) com política **Ratchet** (*dívida legada só pode diminuir, nunca crescer; código novo nasce 100% no padrão*).
   - [`.github/CODEOWNERS`](../.github/CODEOWNERS) exige aprovação obrigatória de `@deeividsaantana` para qualquer alteração em `standards/`, `components.json`, `render.yaml`, `scripts/check-*.mjs`, `.github/`, `AGENTS.md`, `docs/PADRAO_UNICO_ERP.md` e `supabase/migrations/`.
   - [`scripts/check-pr-checklist.mjs`](../scripts/check-pr-checklist.mjs) bloqueia automaticamente qualquer PR que mexa nesses arquivos se a seção `### Alteração de padrão aprovada` não estiver integralmente preenchida e justificada.

---

## 2. Regras Travadas Hoje (`npm run check:standards`)

| Pilar | Regra Obrigatória | Trava |
|---|---|---|
| **Arquitetura & Modularidade** | Nenhum arquivo novo em `src/` ou `api/` acima de **500 linhas**; arquivos legados acima do limite não podem crescer uma única linha. | `ARCH-SIZE` |
| **Fronteiras de Camada** | `src/components/` nunca importa Supabase/Firebase; `src/utils/` é 100% puro (sem React/UI/DB); `src/shared/` e `src/app/shell/` não importam de `src/components/`. | `ARCH-BOUNDARY`, `ARCH-PURE`, `ARCH-LAYER` |
| **Tipagem** | Zero novos `any` em `src/` (teto congelado em `1`, meta `0`). | `TS-ANY` |
| **UI & Design System** | Zero seletores `@media` inválidos; zero novos `!important` em `src/index.css`; zero novos `window.confirm/alert/prompt` (usar `<ConfirmDialog>`). | `CSS-SYNTAX`, `CSS-RATCHET`, `UI-DIALOG` |
| **Segurança & API** | Todo handler em `api/*.js` (exceto rotas públicas listadas no lock) exige `requireSupabaseUser`/`requireStaffUser`/`requireManagerUser`; zero expiração infinita (`2999-12-31`); zero segredo em `VITE_*`; zero proxy local apontando para produção. | `SEC-AUTH`, `SEC-TTL`, `SEC-ENV`, `SEC-PROXY` |
| **Banco de Dados** | Prefixos de migration 100% únicos e numéricos; toda nova migration (`>= 202611280000`) que cria tabela exige `organization_id` e `enable row level security`. | `DB-NAME`, `DB-DUP`, `DB-TENANT`, `DB-RLS` |
| **Higiene do Repositório** | Nenhum novo arquivo `.md` ou `.html` solto na raiz (documentação vai em `docs/`). | `REPO-ROOT` |
| **Integridade do Gate** | `package.json` (`verify`), `.github/workflows/ci.yml` e `.github/CODEOWNERS` não podem remover `check:standards`. | `META-01`, `META-02`, `META-03` |

---

## 3. Regra de Ouro para Alterar o Padrão

Ninguém — desenvolvedor ou agente de IA — pode afrouxar um limite ou alterar o padrão para "fazer um PR passar". Para evoluir o padrão de forma legítima:

1. Abrir PR específico explicando **por que** a regra muda e **qual o plano de migração**.
2. Preencher integralmente `### Alteração de padrão aprovada` no corpo do PR.
3. Obter aprovação obrigatória do dono (`@deeividsaantana`) via **GitHub Branch Protection + Require review from Code Owners** na branch `main`.

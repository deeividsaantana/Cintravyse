# Cintravyse (RENEA ERP): guia para agentes de código

## Antes de alterar

1. Leia `README.md`, `docs/PADRAO_UNICO_ERP.md` e `standards/erp-standards.lock.json`.
2. Confirme `git status`, branch e remote.
3. Preserve dados reais, rotas, cálculos, permissões e links públicos.
4. Rode `npm run verify` (`check:standards` + `lint` + `test` + `build` + `check:bundle`) antes de entregar.

## Stack oficial travada — AI-First ERP Architecture (SEGUIR SOMENTE ESTA STACK)

- **Desenvolvimento:** Vite 6 + React 19 + TypeScript 5.8 (`@/*` -> `./src/*`), Tailwind CSS 4 + **shadcn/ui** (`components.json`, `src/lib/utils.ts`, `src/components/ui/*`, `lucide-react`, `Geist Variable`), **React Hook Form + Zod** (`@hookform/resolvers`), **TanStack Query** (`@tanstack/react-query`).
- **Backend e dados:** Node 22 + Express (`server/index.js`, `api/*.js`) + **Supabase + PostgreSQL** (RLS por organização/obra, Auth, Storage) + SQL migrations (`supabase/migrations/`) + tipos gerados (`src/supabase/database.types.ts`, `npm run db:types`).
- **Qualidade:** **ESLint + Prettier** (`eslint.config.js`, `.prettierrc`), **Vitest + Testing Library + MSW** (`vitest.config.ts`, `npm run test:ui`), **Playwright** (`npm run e2e`), **Sentry** (`src/observability/sentry.ts`, `server/sentry.js`).
- **Infraestrutura:** **GitHub Actions** (`.github/workflows/ci.yml`) + **Render** (`render.yaml`, `autoDeploy: false`) com **deploy condicionado aos testes** (`needs: validate`).
- **Proibido:** Netlify, Firebase/Firestore, bibliotecas de UI/formulário/fetch/animação fora de `standards/erp-standards.lock.json`.
- Não importe SDKs de banco diretamente em componentes de tela (`src/components/**`).
- Nunca exponha `service_role`, token privado ou segredo em código cliente, arquivo versionado ou variável `VITE_*`.

## Invariantes operacionais

- Um registro fornecido nunca deve sumir silenciosamente.
- Ausência de dado não pode virar zero, status ou horário inventado.
- Exclusão operacional é inativação quando o domínio exige histórico.
- Escritas concorrentes devem preservar novidades dos dois lados e respeitar a base de sincronização que diferencia exclusão de criação.
- Links públicos precisam manter token, idempotência, limite de requisições e caminho leve sem carregar o ERP administrativo.

## Banco de dados e migrations

- Toda tabela nova precisa de `organization_id`, `enable row level security`, políticas RLS, autoria, migration versionada com timestamp único, tipo TypeScript e teste.
- Toda alteração em `standards/`, `scripts/check-*.mjs`, `components.json`, `render.yaml`, `.github/`, `AGENTS.md` ou `supabase/migrations/` exige aprovação via `.github/CODEOWNERS`.

## Organização do código

- `src/components/ui`: primitivos oficiais **shadcn/ui** (Tailwind CSS + Radix UI).
- `src/components`: telas e fluxos de interface.
- `src/lib`: utilitários base (`cn()`).
- `src/utils`: regras de domínio puras e testáveis (sem React ou DB).
- `src/cloud`: contratos e gateway de sincronização.
- `src/supabase`: cliente e adaptadores Supabase.
- `server/` e `api/`: servidor Express (Render) e handlers `/api/*`.
- `supabase/migrations`: evolução versionada do PostgreSQL.
- `standards/`: contrato único travado (`erp-standards.lock.json`).
- `tests`: contratos operacionais e redes de proteção.

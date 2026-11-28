# Cintravyse (RENEA ERP)

Webapp operacional SaaS para obras de infraestrutura: controle de frotas e manutenção, combustível, presença em campo, programação/Curva S, estacas, pluviômetro, solicitações/compras, contratação RH assinável e cadastros.

## Stack oficial travada

- **Frontend:** Vite 6 + React 19 + TypeScript 5.8
- **UI:** Tailwind CSS 4 + shadcn/ui (`components.json`, `src/components/ui/*`, `lucide-react`)
- **Validação:** Zod + React Hook Form (`@hookform/resolvers`)
- **Data Fetching:** TanStack Query (`@tanstack/react-query`)
- **Backend / Banco:** Express (Node 22) + Supabase (PostgreSQL, Auth, RLS, Storage)
- **Deploy:** Render (`render.yaml`)

Regras de governança e bloqueio rígido da stack: `docs/PADRAO_UNICO_ERP.md` e `standards/erp-standards.lock.json`.

## Executar localmente

Requisitos: Node.js 22+.

```bash
npm install
npm run dev
```

Para rodar a validação completa (padrão único, tipagem, testes, build e peso do bundle):

```bash
npm run verify
```

## Publicação (Render)

O deploy de produção roda no Render (`render.yaml`): `server/index.js` serve o build do frontend (`dist/`) e a API em `/api/*`.

## Estrutura do repositório

- `src/components/ui/`: primitivos oficiais shadcn/ui.
- `src/components/`: telas e fluxos por módulo.
- `src/utils/`: regras puras de domínio.
- `src/cloud/` e `src/supabase/`: sincronização e persistência Supabase.
- `server/` e `api/`: servidor Express (Render) e endpoints `/api/*`.
- `supabase/migrations/`: migrations versionadas do PostgreSQL.
- `standards/`: trava rígida do padrão único (`erp-standards.lock.json`).
- `tests/`: contratos operacionais (`npm test`) e E2E (`npm run e2e`).
- `docs/`: documentação técnica e `docs/PADRAO_UNICO_ERP.md`.

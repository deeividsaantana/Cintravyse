// Guardião do Padrão Único do Cintravyse ERP.
// Roda no início de "npm run verify", no git pre-push e no GitHub Actions CI.
// Regras novas valem 100% para tudo que entra; dívidas legadas ficam travadas
// em ratchet (só podem diminuir, nunca crescer). Alterar este padrão exige
// aprovação explícita do dono em CODEOWNERS e seção dedicada no PR.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, 'standards', 'erp-standards.lock.json');

const read = relPath => fs.readFileSync(path.join(ROOT, relPath), 'utf8');
const exists = relPath => fs.existsSync(path.join(ROOT, relPath));

const walk = (relDir, extensions, out = []) => {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const relChild = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      walk(relChild, extensions, out);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      out.push(relChild);
    }
  }
  return out;
};

const errors = [];
const fail = (code, message) => errors.push(`[${code}] ${message}`);

if (!exists('standards/erp-standards.lock.json')) {
  console.error('[META-01] Arquivo standards/erp-standards.lock.json ausente.');
  process.exit(1);
}

const lock = JSON.parse(read('standards/erp-standards.lock.json'));

// ---------------------------------------------------------------------------
// 1. META-LOCK: garante que o próprio bloqueio não foi desligado silenciosamente
// ---------------------------------------------------------------------------
const pkg = JSON.parse(read('package.json'));
if (!String(pkg.scripts?.verify || '').includes('check:standards')) {
  fail('META-01', 'package.json: script "verify" deve obrigatoriamente executar "check:standards".');
}
if (!exists('.github/CODEOWNERS')) {
  fail('META-02', '.github/CODEOWNERS ausente — arquivos de padrão ficam sem bloqueio de aprovação.');
} else {
  const codeowners = read('.github/CODEOWNERS');
  for (const required of ['standards/', 'scripts/check-standards.mjs', 'supabase/migrations/']) {
    if (!codeowners.includes(required)) {
      fail('META-02', `.github/CODEOWNERS deve proteger "${required}".`);
    }
  }
}
if (exists('.github/workflows/ci.yml')) {
  const ci = read('.github/workflows/ci.yml');
  if (!ci.includes('check:standards')) {
    fail('META-03', '.github/workflows/ci.yml deve executar "npm run check:standards".');
  }
}

// ---------------------------------------------------------------------------
// 2. ARQUITETURA & FRONTEIRAS DE CAMADA (src/ e api/)
// ---------------------------------------------------------------------------
const srcFiles = walk('src', ['.ts', '.tsx']);
const apiFiles = walk('api', ['.js']);

let anyCount = 0;
let nativeDialogCount = 0;

for (const file of [...srcFiles, ...apiFiles]) {
  const content = read(file);
  const lineCount = content.split('\n').length;
  const legacyMax = lock.legacyAllowlists.maxLines[file];
  const allowedMax = legacyMax ?? lock.limits.maxNewFileLines;

  if (lineCount > allowedMax) {
    fail(
      'ARCH-SIZE',
      `${file} tem ${lineCount} linhas (teto ${allowedMax}${legacyMax ? ' — arquivo legado congelado, não pode crescer' : ''}). Divida em módulos menores.`,
    );
  }

  if (file.startsWith('src/')) {
    const anyMatches = content.match(/(?::\s*any\b|\bas\s+any\b)/g);
    if (anyMatches) anyCount += anyMatches.length;

    const dialogMatches = content.match(/\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/g);
    if (dialogMatches) nativeDialogCount += dialogMatches.length;
  }

  // Componentes de tela NUNCA importam SDK de banco diretamente (AGENTS.md)
  if (file.startsWith('src/components/')) {
    if (/from\s+['"](?:@supabase\/|(?:\.\.\/)+supabase\/|firebase)/.test(content)) {
      fail('ARCH-BOUNDARY', `${file} importa SDK/camada de banco diretamente em componente de tela.`);
    }
  }

  // Regras puras em src/utils NUNCA importam React, telas ou banco
  if (file.startsWith('src/utils/')) {
    if (/from\s+['"](?:react|@supabase\/|(?:\.\.\/)+supabase\/|(?:\.\.\/)+components\/)/.test(content)) {
      fail('ARCH-PURE', `${file} em src/utils/ deve ser regra pura (sem importar React, telas ou banco).`);
    }
  }

  // Shell e UI compartilhada NÃO podem depender de telas (exceto lista legada congelada)
  if (file.startsWith('src/shared/') || file.startsWith('src/app/shell/')) {
    const allowedLegacy = lock.legacyAllowlists.shellOrSharedImportingComponents.includes(file);
    if (!allowedLegacy && /from\s+['"][^'"]*components\//.test(content)) {
      fail('ARCH-LAYER', `${file} cria inversão de camada importando de src/components/. Mova o recurso para src/shared/.`);
    }
  }
}

if (anyCount > lock.limits.maxAnyUsagesInSrc) {
  fail('TS-ANY', `Encontrados ${anyCount} usos de "any" em src/ (teto ${lock.limits.maxAnyUsagesInSrc}).`);
}
if (nativeDialogCount > lock.limits.maxNativeBrowserDialogsInSrc) {
  fail('UI-DIALOG', `Encontrados ${nativeDialogCount} diálogos nativos confirm/alert/prompt em src/ (teto ${lock.limits.maxNativeBrowserDialogsInSrc}). Use <ConfirmDialog>.`);
}

// ---------------------------------------------------------------------------
// 3. PADRÃO VISUAL & CSS (src/index.css)
// ---------------------------------------------------------------------------
if (exists('src/index.css')) {
  const css = read('src/index.css');
  if (/#[\w-]+\s+@media\b/.test(css)) {
    fail('CSS-SYNTAX', 'src/index.css contém seletor inválido antes de @media.');
  }
  const importantCount = (css.match(/!important/g) || []).length;
  if (importantCount > lock.limits.maxCssImportantInIndex) {
    fail('CSS-RATCHET', `src/index.css tem ${importantCount} "!important" (teto congelado: ${lock.limits.maxCssImportantInIndex}).`);
  }
}

// ---------------------------------------------------------------------------
// 4. SEGURANÇA, API & CONFIGURAÇÃO
// ---------------------------------------------------------------------------
for (const file of fs.readdirSync(path.join(ROOT, 'api')).filter(name => name.endsWith('.js'))) {
  const rel = `api/${file}`;
  const content = read(rel);
  if (content.includes('2999-12-31')) {
    fail('SEC-TTL', `${rel} usa expiração infinita (2999-12-31). Toda credencial/link deve expirar.`);
  }
  if (!lock.legacyAllowlists.publicApiHandlers.includes(rel)) {
    if (!/\b(requireSupabaseUser|requireStaffUser|requireManagerUser)\b/.test(content)) {
      fail('SEC-AUTH', `${rel} não chama requireSupabaseUser/requireStaffUser/requireManagerUser. Se for rota pública, registre explicitamente no lock.`);
    }
  }
}

for (const envFile of ['.env.example', '.env.development']) {
  if (!exists(envFile)) continue;
  const content = read(envFile);
  if (/^VITE_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)\s*=/m.test(content)) {
    fail('SEC-ENV', `${envFile} expõe variável secreta com prefixo público VITE_*.`);
  }
}

if (exists('vite.config.ts')) {
  const viteCfg = read('vite.config.ts');
  if (/\|\|\s*['"]https:\/\/renea-erp\.onrender\.com['"]/.test(viteCfg)) {
    fail('SEC-PROXY', 'vite.config.ts não pode apontar proxy local por padrão para produção.');
  }
}

// ---------------------------------------------------------------------------
// 5. BANCO DE DADOS & MIGRATIONS (supabase/migrations/)
// ---------------------------------------------------------------------------
const migrationFiles = fs.readdirSync(path.join(ROOT, 'supabase', 'migrations'))
  .filter(name => name.endsWith('.sql'))
  .sort();
const seenPrefixes = new Map();

for (const file of migrationFiles) {
  const prefix = file.split('_')[0];
  if (!/^\d{12,}$/.test(prefix)) {
    fail('DB-NAME', `supabase/migrations/${file} deve iniciar com timestamp numérico (ex.: 202611280001_descricao.sql).`);
  }
  if (seenPrefixes.has(prefix)) {
    fail('DB-DUP', `Prefixo duplicado "${prefix}" em supabase/migrations/: ${seenPrefixes.get(prefix)} e ${file}.`);
  }
  seenPrefixes.set(prefix, file);

  if (prefix >= lock.migrations.enforceRlsAndOrgFromPrefix) {
    const sql = read(`supabase/migrations/${file}`).toLowerCase();
    if (/create\s+table\b/.test(sql)) {
      if (!sql.includes('organization_id')) {
        fail('DB-TENANT', `Nova migration ${file} cria tabela sem coluna "organization_id".`);
      }
      if (!sql.includes('enable row level security')) {
        fail('DB-RLS', `Nova migration ${file} cria tabela sem "enable row level security".`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. HIGIENE DO REPOSITÓRIO
// ---------------------------------------------------------------------------
const allowedRootDocs = new Set(lock.legacyAllowlists.rootDocsAndHtml);
for (const entry of fs.readdirSync(ROOT)) {
  if (/\.(md|html)$/i.test(entry) && !allowedRootDocs.has(entry)) {
    fail('REPO-ROOT', `Arquivo "${entry}" não permitido na raiz. Salve documentação em docs/.`);
  }
}

// ---------------------------------------------------------------------------
// 7. TRAVA DA STACK OFICIAL (Vite+React+TS, Tailwind+shadcn/ui, Zod+RHF, TanStack Query, Render)
// ---------------------------------------------------------------------------
if (lock.stack) {
  const allowedDeps = new Set([
    ...(lock.stack.allowedDependencies || []),
    ...(lock.stack.deprecatedDependencies || []),
  ]);
  const allowedPrefixes = lock.stack.allowedRadixPrefixes || [];
  const installedDeps = Object.keys(pkg.dependencies || {});

  for (const dep of installedDeps) {
    const allowedByPrefix = allowedPrefixes.some(prefix => dep.startsWith(prefix));
    if (!allowedDeps.has(dep) && !allowedByPrefix) {
      fail('STACK-DEP', `Dependência "${dep}" fora da stack oficial travada em standards/erp-standards.lock.json.`);
    }
  }
  for (const requiredDep of ['react', 'react-dom', '@tailwindcss/vite', '@tanstack/react-query', 'zod', 'react-hook-form', '@hookform/resolvers', 'clsx', 'tailwind-merge', 'class-variance-authority', '@sentry/react', '@sentry/node', 'express', '@supabase/supabase-js']) {
    if (!installedDeps.includes(requiredDep)) {
      fail('STACK-CORE', `Dependência obrigatória da stack oficial ausente em package.json: "${requiredDep}".`);
    }
  }
  const installedDevDeps = Object.keys(pkg.devDependencies || {});
  for (const requiredDevDep of ['eslint', 'prettier', 'vitest', '@testing-library/react', 'msw', '@playwright/test']) {
    if (!installedDevDeps.includes(requiredDevDep)) {
      fail('STACK-QUALITY', `Ferramenta obrigatória de qualidade ausente em devDependencies: "${requiredDevDep}".`);
    }
  }
  for (const requiredFile of [
    ['components.json', 'STACK-UI', 'components.json (shadcn/ui) ausente na raiz do projeto.'],
    ['src/lib/utils.ts', 'STACK-UI', 'src/lib/utils.ts (cn helper do shadcn/ui) ausente.'],
    ['eslint.config.js', 'STACK-QUALITY', 'eslint.config.js ausente na raiz do projeto.'],
    ['.prettierrc', 'STACK-QUALITY', '.prettierrc ausente na raiz do projeto.'],
    ['vitest.config.ts', 'STACK-QUALITY', 'vitest.config.ts ausente na raiz do projeto.'],
    ['src/supabase/database.types.ts', 'STACK-DB', 'src/supabase/database.types.ts (tipos do schema PostgreSQL) ausente.'],
    ['src/observability/sentry.ts', 'STACK-OBS', 'src/observability/sentry.ts (Sentry cliente) ausente.'],
    ['server/sentry.js', 'STACK-OBS', 'server/sentry.js (Sentry servidor) ausente.'],
    ['render.yaml', 'STACK-DEPLOY', 'render.yaml (deploy oficial no Render) ausente.'],
  ]) {
    if (!exists(requiredFile[0])) {
      fail(requiredFile[1], requiredFile[2]);
    }
  }
  if (exists('render.yaml') && !/autoDeploy:\s*false/.test(read('render.yaml'))) {
    fail('STACK-DEPLOY-GATE', 'render.yaml deve manter "autoDeploy: false" para deploy condicionado aos testes no CI.');
  }
  if (exists('.github/workflows/ci.yml') && !/needs:\s*validate/.test(read('.github/workflows/ci.yml'))) {
    fail('STACK-CI-GATE', '.github/workflows/ci.yml deve condicionar o deploy na Render à aprovação do job validate (needs: validate).');
  }

  // Zero Netlify e zero Firebase/Firestore em código de runtime (src, api, server, public)
  const runtimeFiles = [
    ...walk('src', ['.ts', '.tsx', '.css']),
    ...walk('api', ['.js']),
    ...walk('server', ['.js']),
    ...walk('public', ['.js', '.html', '.json', '.css']),
  ];
  for (const file of runtimeFiles) {
    const content = read(file);
    if (/netlify|x-nf-/i.test(content)) {
      fail('STACK-NO-NETLIFY', `${file} contém resquício proibido de Netlify. Deploy oficial é exclusivamente Render.`);
    }
    if (/firebase|firestore/i.test(content)) {
      fail('STACK-NO-FIREBASE', `${file} contém resquício proibido de Firebase/Firestore. Banco oficial é exclusivamente Supabase.`);
    }
  }

  // Zero novos arquivos importando GSAP (apenas allowlist legada congelada)
  const allowedGsap = new Set(lock.legacyAllowlists.gsapFiles || []);
  for (const file of srcFiles) {
    const content = read(file);
    if (/from\s+['"](?:gsap|@gsap\/react)['"]/.test(content) && !allowedGsap.has(file)) {
      fail('STACK-NO-GSAP', `${file} importa gsap/@gsap/react fora da lista legada congelada. Use transições CSS/Tailwind.`);
    }
  }

  // Zero build artifacts versionados em dist/
  try {
    const trackedDist = execFileSync('git', ['ls-files', 'dist'], { encoding: 'utf8' }).trim();
    if (trackedDist) {
      fail('REPO-DIST', `Arquivos gerados em dist/ estão versionados no git. Remova com "git rm -r --cached dist".`);
    }
  } catch {
    // Sem git disponível no ambiente (ex.: build isolado sem .git)
  }
}

if (errors.length > 0) {
  console.error('\nBLOQUEIO DO PADRÃO ÚNICO (npm run check:standards):\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nCorrija os desvios acima. Para alterar uma regra do padrão, siga docs/PADRAO_UNICO_ERP.md.\n');
  process.exit(1);
}

console.log(`Padrão único OK (${srcFiles.length} arquivos src, ${apiFiles.length} api, ${migrationFiles.length} migrations verificadas).`);

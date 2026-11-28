// Trava do checklist do PR (CONTRIBUTING.md, seção 4). Roda no CI em todo
// pull request: o corpo precisa trazer a seção "## Checklist" com todos os
// itens marcados, e, se o PR cria ou altera tela, a seção "### Se mexeu em
// tela" também toda marcada.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const body = process.env.PR_BODY || '';
const base = process.env.BASE_REF || 'main';

const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=AMRD', `origin/${base}...HEAD`], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const mexeuEmTela = changed.some(file => /^src\/(components|shared\/ui)\/.+\.(tsx|css)$/.test(file));

let protectedFiles = [
  'standards/erp-standards.lock.json',
  'scripts/check-standards.mjs',
  'scripts/check-bundle-size.mjs',
  'scripts/check-pr-checklist.mjs',
  '.github/CODEOWNERS',
  '.github/workflows/ci.yml',
  '.github/workflows/pr-checklist.yml',
  'AGENTS.md',
  'docs/PADRAO_UNICO_ERP.md',
];
try {
  const lock = JSON.parse(fs.readFileSync('standards/erp-standards.lock.json', 'utf8'));
  if (Array.isArray(lock.protectedFiles) && lock.protectedFiles.length) {
    protectedFiles = lock.protectedFiles;
  }
} catch {
  // Usa lista padrão se o lock foi removido — o próprio check vai travar o PR.
}
const mexeuNoPadrao = changed.filter(file => protectedFiles.includes(file));

const secao = (titulo) => {
  const inicio = body.indexOf(titulo);
  if (inicio < 0) return null;
  const resto = body.slice(inicio + titulo.length);
  const fim = resto.search(/\n#{2,3} /);
  return fim < 0 ? resto : resto.slice(0, fim);
};

const erros = [];
const verificar = (titulo) => {
  const texto = secao(titulo);
  if (texto === null) {
    erros.push(`Falta a seção "${titulo}" do modelo de PR (.github/pull_request_template.md).`);
    return;
  }
  const abertos = texto.split('\n').filter(linha => /^\s*- \[ \]/.test(linha));
  for (const linha of abertos) erros.push(`Item sem marcar em "${titulo}": ${linha.trim()}`);
  if (!/^\s*- \[[xX]\]/m.test(texto)) erros.push(`A seção "${titulo}" está sem itens marcados.`);
};

verificar('## Checklist');
if (mexeuEmTela) verificar('### Se mexeu em tela');
if (mexeuNoPadrao.length > 0) {
  verificar('### Alteração de padrão aprovada');
  console.log(`Arquivos protegidos do padrão alterados: ${mexeuNoPadrao.join(', ')}`);
}

if (erros.length) {
  console.error('Checklist do PR incompleto:\n');
  for (const erro of erros) console.error(`- ${erro}`);
  console.error('\nPreencha o checklist no corpo do PR. Regras em CONTRIBUTING.md (seção 4) e docs/PADRAO_UNICO_ERP.md.');
  process.exit(1);
}
console.log(mexeuEmTela ? 'Checklist geral e de tela completos.' : 'Checklist geral completo.');

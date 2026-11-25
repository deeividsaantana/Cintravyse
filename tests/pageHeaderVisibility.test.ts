import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 25/11/2026: o Deivid pediu para tirar o título grande de cada aba, que
// repetia o nome já mostrado no caminho do topo. O título segue no código
// (h1/h2 para o leitor de tela) e o caminho do topo mostra o nome da tela.
const source = readFileSync(new URL('../src/shared/ui/PageHeader.tsx', import.meta.url), 'utf8');
const topo = readFileSync(new URL('../src/app/shell/DesktopTopBar.tsx', import.meta.url), 'utf8');
assert.match(source, /<Titulo className="renea-page-header__titulo">\{title\}<\/Titulo>/, 'o título continua no cabeçalho para o leitor de tela');
assert.match(topo, /trilhaDaAba/, 'o nome da tela aparece no caminho da barra do topo');

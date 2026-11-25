import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modalSource = readFileSync('src/shared/ui/Modal.tsx', 'utf8');
const presenceSource = readFileSync('src/components/ControlePresencaTab.tsx', 'utf8');
const styles = readFileSync('src/index.css', 'utf8');

test('modal compartilhado renderiza na viewport fora da árvore animada', () => {
  assert.match(modalSource, /createPortal\s*\(/);
  assert.match(modalSource, /document\.body/);
});

test('editores de presença usam o mesmo portal de viewport', () => {
  assert.match(presenceSource, /createPortal\s*\(/);
});

test('animação de entrada não mantém transform no ancestral dos diálogos', () => {
  // Padrão Cintravyse (25/11/2026): a troca de tela só esmaece, sem
  // transform, então nenhum ancestral dos diálogos fica com transform.
  const troca = styles.match(/@keyframes cv-troca\s*\{[^\n]*\}/)?.[0] || '';
  assert.match(troca, /opacity/);
  assert.doesNotMatch(troca, /transform/);
  assert.doesNotMatch(styles, /renea-white-reveal/);
});

test('digitar num campo do modal não devolve o foco ao primeiro botão', () => {
  // onSubmit e onClose mudam a cada digitação de quem usa o Modal; se entrarem
  // nas dependências do efeito, o foco volta ao botão de fechar a cada letra.
  const dependencias = modalSource.match(/\}, \[([^\]]*)\]\);/)?.[1] ?? '';
  assert.doesNotMatch(dependencias, /onSubmit|onClose/);
  assert.match(modalSource, /acoes\.current = \{ onSubmit, onClose \}/);
});

test('painel do equipamento abre no padrão de lançamento (tela cheia, Ctrl+S)', () => {
  assert.match(modalSource, /modal-tela-cheia:\$\{nome\}/);
  assert.match(modalSource, /h-\[100dvh\]/);
  const painel = readFileSync('src/components/quadroFrota/PainelEquipamento.tsx', 'utf8');
  assert.match(painel, /^\s*lancamento$/m);
  assert.match(painel, /onSubmit=\{podeEditar \? \(\) => salvar\(false\) : undefined\}/);
});

test('lançamento da frota ocupa a área da aba e salva com Ctrl+S', () => {
  const form = readFileSync('src/components/fleet/DailyRecordForm.tsx', 'utf8');
  assert.match(form, /^\s*lancamento$/m);
  assert.match(form, /onSubmit=\{/);
});

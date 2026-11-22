import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// 22/11/2026: o Deivid pediu para tirar as notificações. Saíram o sino, a
// central de avisos, os alertas "Precisa de atenção" e a lista guardada no
// aparelho e na nuvem. Fica só o aviso rápido no canto quando algo dá erro ou
// não foi salvo.
const ler = (arquivo: string) => readFileSync(arquivo, 'utf8');

test('sem sino e sem central de notificações', () => {
  for (const arquivo of ['src/app/shell/NotificationCenter.tsx', 'src/notifications/notificationService.ts', 'src/utils/notificacoes.ts', 'src/utils/alertas.ts']) {
    assert.equal(existsSync(arquivo), false, `${arquivo} não volta`);
  }
  const app = ler('src/App.tsx');
  assert.doesNotMatch(app, /NotificationCenter|renea_notifications|addNotification|alertasDoSistema/);
  assert.doesNotMatch(ler('src/app/shell/DesktopTopBar.tsx'), /Notification|Bell/);
  assert.doesNotMatch(ler('src/cloud/types.ts'), /'notifications'/, 'a lista de avisos não vai mais para a nuvem');
});

test('o aviso rápido é só para erro ou algo que não foi salvo', () => {
  const app = ler('src/App.tsx');
  for (const [, tipo] of app.matchAll(/avisar\([^;]*?,\s*'(info|success)'\)/g)) assert.fail(`aviso de ${tipo} não volta`);
  assert.match(app, /<ToastViewport toasts=\{avisosNaTela\} \/>/);
});

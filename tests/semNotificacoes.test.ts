import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

// 22/11/2026: o Deivid pediu para tirar as notificações. Saíram o sino, a
// central de avisos, os alertas "Precisa de atenção" e a lista guardada no
// aparelho e na nuvem. Depois ele pediu "tira todas as notificações": saíram
// também o aviso rápido no canto e as faixas que aparecem sozinhas.
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

test('nenhum aviso aparece sozinho na tela', () => {
  assert.equal(existsSync('src/shared/components/feedback/ToastViewport.tsx'), false, 'o aviso no canto não volta');
  const app = ler('src/App.tsx');
  assert.doesNotMatch(app, /ToastViewport|avisosNaTela|\bavisar\(/);
  assert.doesNotMatch(ler('src/components/CadastrosTab.tsx'), /data-testid="cadastro-aviso"|createPortal/);
  assert.match(ler('src/components/quadroFrota/QuadroFrota.tsx'), /className="sr-only" data-testid="quadro-aviso"/);
  assert.doesNotMatch(ler('src/components/SolicitacoesTab.tsx'), /bg-emerald-50 text-emerald-800/);
});

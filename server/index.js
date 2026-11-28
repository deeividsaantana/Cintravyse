// Servidor único do RENEA ERP para hospedagem sem cartão (Render free).
// Serve o build do frontend (dist/) e a API (handlers em api/) no mesmo
// domínio, em /api/... O front não precisa saber onde está hospedado.
import crypto from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toExpressHandler } from './handlerAdapter.js';
import { captureServerException, initServerSentry } from './sentry.js';

import { handler as publicPresenca } from '../api/public-presenca.js';
import { handler as masterData } from '../api/master-data.js';
import { handler as usageTelemetry } from '../api/usage-telemetry.js';
import { handler as cleanupCloudData } from '../api/cleanup-cloud-data.js';
import { handler as procurement } from '../api/procurement.js';
import { handler as procurementSheet } from '../api/procurement-sheet.js';
import { handler as contratacao } from '../api/contratacao.js';
import { handler as devAcessos } from '../api/dev-acessos.js';
import { handler as primeiroAcesso } from '../api/primeiro-acesso.js';
import { sincronizarUmaVez } from './procurementSpreadsheetSyncJob.js';

const sentryEnabled = initServerSentry();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = express();
app.disable('x-powered-by');
// Corpo cru como string: os handlers fazem o próprio parse/limite de tamanho
// (parseJsonBody em supabase-admin.js), no formato de evento que os handlers esperam.
// 5mb cobre os lotes de importação (até 4 MB em api/master-data.js).
app.use(express.text({ type: '*/*', limit: '5mb' }));

app.use((error, req, res, next) => {
  if (error && (error.type === 'entity.too.large' || error.status === 413)) {
    res.status(413).json({ success: false, message: 'O envio excede o tamanho permitido.' });
    return;
  }
  next(error);
});

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', CSP_HEADER);
  if (process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// A API vive exclusivamente em /api/ no servidor Render.
app.get('/api/public-presenca', toExpressHandler(publicPresenca));
app.post('/api/public-presenca', toExpressHandler(publicPresenca));
app.patch('/api/public-presenca', toExpressHandler(publicPresenca));
app.delete('/api/public-presenca', toExpressHandler(publicPresenca));

app.all('/api/master-data', toExpressHandler(masterData));
app.all('/api/usage-telemetry', toExpressHandler(usageTelemetry));
app.all('/api/procurement', toExpressHandler(procurement));
app.all('/api/procurement-sheet', toExpressHandler(procurementSheet));
app.all('/api/contratacao', toExpressHandler(contratacao));
app.all('/api/dev-acessos', toExpressHandler(devAcessos));
app.all('/api/primeiro-acesso', toExpressHandler(primeiroAcesso));

// Não existe cron nativo no plano gratuito: um pinger externo gratuito (cron-job.org,
// sem cartão) chama esta rota 1x/dia com o segredo configurado no painel.
app.post('/tasks/cleanup-cloud-data', async (req, res) => {
  const expected = process.env.CLEANUP_TASK_SECRET || '';
  const provided = String(req.headers['x-task-secret'] || '');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const matches = expected
    && expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!matches) {
    res.status(403).json({ success: false, message: 'Segredo da tarefa ausente ou inválido.' });
    return;
  }
  try {
    const result = await cleanupCloudData();
    res.status(Number(result?.statusCode) || 200).send(result?.body ?? '');
  } catch (error) {
    // Sem isto a falha ficava sem resposta e o pinger esperava até estourar o tempo.
    console.error('Limpeza da nuvem falhou:', error);
    captureServerException(error, { task: 'cleanup-cloud-data' });
    res.status(500).json({ success: false, message: 'A limpeza falhou; veja o log do servidor.' });
  }
});

// Pinger de manutenção (UptimeRobot, cron-job.org): evita o serviço dormir
// no plano gratuito e serve como checagem simples de saúde.
app.get('/health', (req, res) => res.status(200).json({
  ok: true,
  supabaseConfigured: Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY),
  sentryConfigured: sentryEnabled,
}));

// Rota de API que não existe responde 404 em JSON, não a página do site
// (antes o app recebia HTML com 200 e quebrava ao ler a resposta).
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Rota da API não encontrada.' });
});

app.use(express.static(distDir, {
  maxAge: '1y',
  index: false,
  setHeaders: (res, filePath) => {
    // O browser consulta o service worker para saber se existe uma versão nova.
    // Cache de um ano aqui fazia um deploy continuar servindo o shell antigo.
    if (filePath.endsWith('service-worker.js') || filePath.endsWith('manifest.webmanifest') || filePath.endsWith('favicon.png')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  },
}));

// Arquivo que não existe (ex.: /assets/App-abc123.js de um deploy anterior)
// responde 404. Antes voltava a página do site no lugar do código, e quem
// estava com o site aberto durante um deploy via a tela travar em branco; o
// app agora percebe o 404 e recarrega sozinho (main.tsx, vite:preloadError).
app.get('/assets/*', (req, res) => {
  res.status(404).type('text/plain').send('Arquivo não encontrado.');
});

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`RENEA ERP no ar em http://localhost:${port}`);
  // Limpeza diária feita pelo próprio servidor (25/11/2026): antes dependia de
  // um pinger externo com segredo, que não estava ligado, e as janelas do
  // limite de requisições ficavam no banco para sempre. O UptimeRobot já
  // mantém o serviço acordado, então o relógio daqui basta.
  const umDia = 24 * 60 * 60 * 1000;
  const limpar = () => void Promise.resolve().then(() => cleanupCloudData())
    .catch(error => console.error('Limpeza diária da nuvem falhou:', error));
  setTimeout(limpar, 5 * 60 * 1000).unref();
  setInterval(limpar, umDia).unref();
  if (process.env.PROCUREMENT_SPREADSHEET_URL) {
    const everyThreeHours = 3 * 60 * 60 * 1000;
    void sincronizarUmaVez().catch(error => console.error('Sincronização da planilha de compras falhou:', error));
    setInterval(() => void sincronizarUmaVez().catch(error => console.error('Sincronização da planilha de compras falhou:', error)), everyThreeHours).unref();
  }
});

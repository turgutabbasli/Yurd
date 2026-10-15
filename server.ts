import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { handleChat, handleAdvisor } from './server/ai.ts';

// Local/self-hosted server: serves the app plus /api/chat and /api/advisor.
// On Netlify the same endpoints run as Edge Functions (netlify/edge-functions) using the same server/ai.ts.
const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production' || path.basename(here) === 'dist';
const portArg = process.argv.find(a => a.startsWith('--port='));
const PORT = Number(portArg?.split('=')[1] || process.env.PORT || 3000);
const env = (name: string) => process.env[name];

async function start() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.post('/api/chat', async (req, res) => {
    const { status, payload } = await handleChat(req.body, req.ip || 'unknown', env);
    res.status(status).json(payload);
  });

  app.post('/api/advisor', async (req, res) => {
    const { status, payload } = await handleAdvisor(req.body, req.ip || 'unknown', env);
    res.status(status).json(payload);
  });

  if (isProd) {
    const distDir = fs.existsSync(path.join(here, 'index.html')) ? here : path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  const providers = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY'].filter(k => process.env[k]);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yurd server: http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
    console.log(`AI providers: ${providers.length ? providers.join(', ') : 'none configured (chat shows a friendly message)'}`);
  });
}

start();

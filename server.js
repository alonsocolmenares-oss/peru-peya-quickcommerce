// Servidor de Cloud Run: sirve index.html y hace de proxy hacia los webhooks de n8n,
// para que el navegador nunca vea las credenciales (Basic Auth desde Secret Manager).
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

const N8N_USER = process.env.N8N_WEBHOOK_USER || '';
const N8N_PASSWORD = process.env.N8N_WEBHOOK_PASSWORD || '';
const TIMEOUT_MS = 30000;

// Ruta del navegador -> variable de entorno con la URL del webhook de n8n.
// Hourly Times filtra por _source=peyatimes en el navegador, asi que si no hay
// un webhook propio usa el mismo de Hourly Ops.
const ROUTES = {
  '/api/dashboard-data': () => process.env.N8N_DASHBOARD_URL,
  '/api/peya-hourly-data': () => process.env.N8N_HOURLY_URL,
  '/api/peya-times-data': () => process.env.N8N_TIMES_URL || process.env.N8N_HOURLY_URL,
  '/api/plan-data': () => process.env.N8N_PLAN_URL,
};

function authHeader() {
  if (!N8N_USER && !N8N_PASSWORD) return {};
  return { Authorization: 'Basic ' + Buffer.from(`${N8N_USER}:${N8N_PASSWORD}`).toString('base64') };
}

for (const [route, getUrl] of Object.entries(ROUTES)) {
  app.get(route, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const base = getUrl();
    if (!base) {
      console.error(`${route}: falta configurar la URL del webhook de n8n`);
      return res.status(503).json({ error: `Webhook no configurado para ${route}` });
    }
    const url = new URL(base);
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') url.searchParams.set(k, v);
    }
    try {
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json', ...authHeader() },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await upstream.text();
      if (!upstream.ok) {
        console.error(`${route}: n8n respondio ${upstream.status}: ${body.slice(0, 300)}`);
        return res.status(502).json({ error: `n8n respondio ${upstream.status}` });
      }
      res.type('application/json').send(body);
    } catch (err) {
      console.error(`${route}: error llamando a n8n:`, err.message);
      res.status(502).json({ error: 'No se pudo contactar a n8n' });
    }
  });
}

app.get('/healthz', (req, res) => res.send('ok'));
app.get(['/', '/index.html'], (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`peru-peya-dashboard-poc escuchando en :${PORT}`));

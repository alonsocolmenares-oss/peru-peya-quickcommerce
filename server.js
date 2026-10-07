const express = require('express');
const path = require('path');

const app = express();

// Cloud Run injects the PORT environment variable at runtime.
// The app MUST listen on this port and must not hardcode a port number.
const PORT = process.env.PORT || 8080;

const N8N_WEBHOOK_URL = 'https://n8n.andino.poc.zubale.com/webhook/peya-dashboard-data';

app.use(express.static(path.join(__dirname, 'public')));

// Proxy: el navegador llama aqui (mismo origen, sin CORS y sin credenciales visibles).
// El servidor es quien llama a n8n usando Basic Auth, leyendo usuario/password
// desde variables de entorno (inyectadas via Secret Manager en cloudbuild.yaml).
app.get('/api/dashboard-data', async (req, res) => {
  const user = process.env.N8N_WEBHOOK_USER;
  const pass = process.env.N8N_WEBHOOK_PASSWORD;

  if (!user || !pass) {
    console.error('Faltan N8N_WEBHOOK_USER / N8N_WEBHOOK_PASSWORD en el entorno del servidor.');
    return res.status(500).json({ error: 'Credenciales del webhook no configuradas en el servidor' });
  }

  try {
    // Reenvia al webhook de n8n los mismos query params que mando el navegador
    // (source, dateFrom, dateTo, etc.), para que el filtrado server-side en n8n
    // realmente reciba algo y no vea siempre "query": {} vacio.
    const targetUrl = new URL(N8N_WEBHOOK_URL);
    for (const [key, value] of Object.entries(req.query)) {
      if (value !== undefined && value !== null && value !== '') {
        targetUrl.searchParams.set(key, value);
      }
    }

    const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    const response = await fetch(targetUrl.toString(), {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      console.error(`n8n respondio con status ${response.status}`);
      return res.status(502).json({ error: `El webhook de n8n respondio con status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error llamando al webhook de n8n:', err);
    res.status(502).json({ error: 'No se pudo conectar con el webhook de n8n' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`peru-peya-dashboard-poc listening on port ${PORT}`);
});

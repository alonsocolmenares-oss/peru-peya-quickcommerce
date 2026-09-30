const express = require('express');
const path = require('path');

const app = express();

// Cloud Run injects the PORT environment variable at runtime.
// The app MUST listen on this port and must not hardcode a port number.
const PORT = process.env.PORT || 8080;

const N8N_WEBHOOK_URL = 'https://n8n.andino.poc.zubale.com/webhook/peya-dashboard-data';

// Webhook dedicado: data operativa de PedidosYa con granularidad horaria.
// Usa las mismas credenciales (N8N_WEBHOOK_USER/PASSWORD) que el webhook principal.
const N8N_PEYA_HOURLY_WEBHOOK_URL = 'https://n8n.andino.poc.zubale.com/webhook/c97c3d47-ae6f-458a-8f2f-61b05b335497';

// Webhook dedicado: tiempos operativos por hora de PedidosYa ("Hourly Times").
// Misma autenticacion (N8N_WEBHOOK_USER/PASSWORD) que los demas webhooks.
const N8N_PEYA_TIMES_WEBHOOK_URL = 'https://n8n.andino.poc.zubale.com/webhook/319fb3a0-671f-476e-a539-89a3b08c7dc7';

// Webhook dedicado: planificacion de turnos ("Horarios") de PedidosYa x Zubale.
// Misma autenticacion (N8N_WEBHOOK_USER/PASSWORD) que los demas webhooks.
const N8N_PLAN_WEBHOOK_URL = 'https://n8n.andino.poc.zubale.com/webhook/f152c333-69b8-42b7-af89-00b40b56c0a8';

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

// Proxy dedicado para el webhook horario de PedidosYa. Mismo patron que /api/dashboard-data
// (Basic Auth con las mismas credenciales, reenvio de query params), pero apuntando a la
// URL de n8n dedicada a granularidad por hora.
app.get('/api/peya-hourly-data', async (req, res) => {
  const user = process.env.N8N_WEBHOOK_USER;
  const pass = process.env.N8N_WEBHOOK_PASSWORD;

  if (!user || !pass) {
    console.error('Faltan N8N_WEBHOOK_USER / N8N_WEBHOOK_PASSWORD en el entorno del servidor.');
    return res.status(500).json({ error: 'Credenciales del webhook no configuradas en el servidor' });
  }

  try {
    const targetUrl = new URL(N8N_PEYA_HOURLY_WEBHOOK_URL);
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
      console.error(`n8n (PeYa horario) respondio con status ${response.status}`);
      return res.status(502).json({ error: `El webhook de n8n respondio con status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error llamando al webhook de n8n (PeYa horario):', err);
    res.status(502).json({ error: 'No se pudo conectar con el webhook de n8n' });
  }
});

// Proxy dedicado para el webhook de "Hourly Times" de PedidosYa. Mismo patron que los
// demas proxies (Basic Auth con las mismas credenciales, reenvio de query params),
// apuntando a su propia URL de n8n (no comparte webhook con "Hourly Ops").
app.get('/api/peya-times-data', async (req, res) => {
  const user = process.env.N8N_WEBHOOK_USER;
  const pass = process.env.N8N_WEBHOOK_PASSWORD;

  if (!user || !pass) {
    console.error('Faltan N8N_WEBHOOK_USER / N8N_WEBHOOK_PASSWORD en el entorno del servidor.');
    return res.status(500).json({ error: 'Credenciales del webhook no configuradas en el servidor' });
  }

  try {
    const targetUrl = new URL(N8N_PEYA_TIMES_WEBHOOK_URL);
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
      console.error(`n8n (PeYa times) respondio con status ${response.status}`);
      return res.status(502).json({ error: `El webhook de n8n respondio con status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error llamando al webhook de n8n (PeYa times):', err);
    res.status(502).json({ error: 'No se pudo conectar con el webhook de n8n' });
  }
});

// Proxy dedicado para el webhook de "Horarios" (planificacion de turnos) de PedidosYa.
// Mismo patron que los demas proxies (Basic Auth con las mismas credenciales, reenvio
// de query params), apuntando a su propia URL de n8n.
app.get('/api/plan-data', async (req, res) => {
  const user = process.env.N8N_WEBHOOK_USER;
  const pass = process.env.N8N_WEBHOOK_PASSWORD;

  if (!user || !pass) {
    console.error('Faltan N8N_WEBHOOK_USER / N8N_WEBHOOK_PASSWORD en el entorno del servidor.');
    return res.status(500).json({ error: 'Credenciales del webhook no configuradas en el servidor' });
  }

  try {
    const targetUrl = new URL(N8N_PLAN_WEBHOOK_URL);
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
      console.error(`n8n (plan/horarios) respondio con status ${response.status}`);
      return res.status(502).json({ error: `El webhook de n8n respondio con status ${response.status}` });
    }

    const data = await response.json();
    // El webhook de n8n devuelve un array plano ([{...}, {...}]), pero el frontend de
    // Horarios espera un objeto envuelto { records: [...], fetchedAt: "..." }. Aqui se
    // normaliza cualquiera de las dos formas a la que espera el frontend. NO se filtra
    // por _source aqui: el mismo webhook trae tanto filas "plan" (planificacion) como
    // "real" (asistencia), y el frontend distingue cual es cual para cada tabla.
    const records = Array.isArray(data) ? data : (Array.isArray(data && data.records) ? data.records : []);
    res.json({ records, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Error llamando al webhook de n8n (plan/horarios):', err);
    res.status(502).json({ error: 'No se pudo conectar con el webhook de n8n' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`peru-peya-dashboard-poc listening on port ${PORT}`);
});

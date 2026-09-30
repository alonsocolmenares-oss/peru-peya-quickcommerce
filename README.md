# peru-peya-dashboard-poc

## Descripción

Este POC es un dashboard operativo de la operación **Quickcommerce de PedidosYa en Perú**.

El dashboard presenta KPIs de fulfillment (órdenes, rating, order lost, replacement rate, seamless orders, picking time, y otras métricas operativas) organizados en tres vistas: **Macro**, **Trends** y **Heatmap**, con filtros por cadena (Metro / Tottus / Wong), tienda, y periodo (diario / semanal / mensual).

## Owner

**Alonso Colmenares**

## Actualización de datos

- La información *underlying* se actualizará de forma **diaria** a través de la **descarga automática de un Data Studio externo** (owner: PeYa).
- El **procesamiento y compilación** de esa información hacia **Google Sheets** se realiza mediante un **flujo de n8n**.
- El dashboard (este proyecto) lee el Google Sheet resultante y se reconstruye/despliega con los datos más recientes.

## Stack

- Sitio estático (`index.html`, sin build step) servido por un pequeño servidor Express (`server.js`) en `$PORT`.
- `server.js` hace de proxy hacia los webhooks de n8n, así el navegador nunca ve las credenciales:

| Ruta | Variable con la URL de n8n |
|---|---|
| `/api/dashboard-data` | `N8N_DASHBOARD_URL` |
| `/api/peya-hourly-data` | `N8N_HOURLY_URL` |
| `/api/peya-times-data` | `N8N_TIMES_URL` (si está vacía, usa `N8N_HOURLY_URL`) |
| `/api/plan-data` | `N8N_PLAN_URL` |

- Credenciales de n8n (Basic Auth) desde Secret Manager: `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`.

## Desarrollo local

```bash
npm install
N8N_DASHBOARD_URL=... N8N_HOURLY_URL=... N8N_PLAN_URL=... \
N8N_WEBHOOK_USER=... N8N_WEBHOOK_PASSWORD=... npm start
```

El servidor escucha en `process.env.PORT` (por defecto `8080` si no está definido).

## Despliegue

Este proyecto se despliega a **Google Cloud Run** vía `cloudbuild.yaml`. Ver la sección de handover en el PR/documentación de despliegue para los pasos requeridos por TechOps (branch `dev`, permisos de GitHub team, etc.).

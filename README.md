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

- Sitio estático (HTML/CSS/JS, sin build step) servido por un pequeño servidor Express (`server.js`), necesario únicamente para satisfacer el requisito de Cloud Buildpacks de detectar un runtime y exponer el proceso en `$PORT`.
- La portada es un tablero ejecutivo (resumen del último trimestre, Financial y Operational overview a nivel país y por cliente) que se arma en el navegador con `/api/dashboard-data`: P&L con `_source=pnl` y KPIs operativos con `_source=opkpis<cliente>`. Cada trimestre se compara con el anterior.
- `public/index.html` es el portal; cada sub-dashboard (P&L, Operations) es un archivo propio en `public/embeds/` que se descarga al abrir su pestaña.
- `server.js` hace de proxy hacia el webhook de n8n (`/api/dashboard-data`) con Basic Auth. Credenciales desde Secret Manager: `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`.

## Desarrollo local

```bash
npm install
npm start
```

El servidor escucha en `process.env.PORT` (por defecto `8080` si no está definido).

## Despliegue

Este proyecto se despliega a **Google Cloud Run** vía `cloudbuild.yaml`. Ver la sección de handover en el PR/documentación de despliegue para los pasos requeridos por TechOps (branch `dev`, permisos de GitHub team, etc.).

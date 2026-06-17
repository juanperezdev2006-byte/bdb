# Backend Cloudflare Workers + D1

1. Reemplaza `database_id` en `wrangler.toml`.
2. Ejecuta `npm install`.
3. Prueba localmente con `npm run dev`.
4. Despliega con `npm run deploy`.

Este ejemplo migra:
- GET /api/health
- POST /api/auth/registro
- POST /api/auth/login (Clave Segura)

Debes migrar manualmente las validaciones y el flujo de tarjeta débito.

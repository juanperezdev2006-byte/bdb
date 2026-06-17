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


# Desarrollo local y despliegue

## Ejecutar localmente usando la base de datos remota de Cloudflare D1

Instala las dependencias:

```bash
npm install
```

Inicia sesión en Cloudflare:

```bash
npx wrangler login
```

Verifica que `wrangler.toml` tenga configurada la base de datos correcta:

```toml
[[d1_databases]]
binding = "DB"
database_name = "bdb"
database_id = "TU_DATABASE_ID"
```

Inicia el servidor local conectado a la base de datos remota:

```bash
npx wrangler dev --remote
```

La API estará disponible en:

```text
http://127.0.0.1:8787
```

Puedes probar el estado del servicio en:

```text
http://127.0.0.1:8787/api/health
```

> **Importante:** Todas las operaciones de lectura y escritura afectarán directamente la base de datos de producción configurada en D1.

---

## Desplegar a producción

Publica una nueva versión del Worker:

```bash
npm run deploy
```

O directamente:

```bash
npx wrangler deploy
```

Una vez finalizado el despliegue, Cloudflare mostrará una URL similar a:

```text
https://bdb-api.<tu-subdominio>.workers.dev
```

Puedes verificar el despliegue accediendo a:

```text
https://bdb-api.<tu-subdominio>.workers.dev/api/health
```

---

## Comandos útiles

Ver la cuenta autenticada:

```bash
npx wrangler whoami
```

Ver los logs en tiempo real del Worker desplegado:

```bash
npx wrangler tail
```

Ejecutar consultas SQL sobre D1:

```bash
npx wrangler d1 execute bdb --remote --command="SELECT COUNT(*) FROM usuarios;"
```

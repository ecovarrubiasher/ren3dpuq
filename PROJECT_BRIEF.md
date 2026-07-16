# Ren3D — resumen del proyecto (leer antes de tocar nada)

Sitio de ventas para Ren3D, tienda de impresiones 3D en Punta Arenas, Chile.
Dueño: Eduardo (cuenta Cloudflare: ecovarrubias.her@gmail.com).

## Estado actual

- **Sitio en vivo**: https://ren3dpuq.cl
- **Proyecto Cloudflare**: Worker llamado `ren3dpuq` (no es un proyecto "Pages" clásico — es un Worker con "static assets" + lógica de API propia).
- **Carpeta local**: `C:\Users\EduS\Documents\ren3dpuq` (este mismo directorio).
- **Despliegue**: manual, con `npx wrangler deploy` desde esta carpeta. Wrangler ya está logueado en este equipo (no hace falta `wrangler login` de nuevo mientras se use la misma sesión de Windows). No hay Git ni CI/CD.

## Arquitectura

- `index.html`, `css/style.css`, `js/script.js` — sitio público. Los productos y categorías NO están hardcodeados: se cargan en tiempo real desde `/api/products` y `/api/categories` (rutas públicas del Worker, que leen de una base D1).
- `worker/index.js` — el Worker. Sirve los archivos estáticos (`env.ASSETS.fetch`) y además maneja:
  - `/api/products`, `/api/categories` (públicas, solo lectura)
  - `/uploads/:key` (público, sirve imágenes subidas desde el panel, guardadas en KV)
  - `/gestion-x7q2k9` — **panel de administración** (ver abajo)
- Base de datos: **D1** llamada `ren3dpuq-db` (productos y categorías).
- Almacenamiento de imágenes subidas: **KV namespace** `ren3dpuq_images` (se usó KV en vez de R2 porque activar R2 pedía método de pago y la tarjeta del dueño daba error — KV es gratis y no lo pide).
- Config completa de bindings en `wrangler.toml`.

## Panel de administración

- URL: `https://ren3dpuq.cl/gestion-x7q2k9` (ruta intencionalmente no obvia, no es `/admin`).
- Protegido con login propio (usuario solo pide contraseña, sin usuario/email) — **no** usa Cloudflare Access (se intentó, pero pedía tarjeta de pago igual que R2).
- La contraseña está guardada como **Cloudflare secret** (`ADMIN_PASSWORD`, encriptado, no está en ningún archivo del proyecto). Si el dueño la perdió, se resetea con:
  `npx wrangler secret put ADMIN_PASSWORD` (pide el valor nuevo por stdin).
- Desde el panel se pueden agregar/editar/eliminar productos (con foto) y categorías. Los cambios se reflejan al instante en el sitio público, sin necesidad de volver a desplegar.
- **Importante**: `admin.html` y `login.html` están bloqueados a acceso directo por nombre de archivo (devuelven 404) — solo son alcanzables a través de la ruta `/gestion-x7q2k9`, que decide cuál mostrar según si hay sesión válida. Si se edita `worker/index.js`, no romper ese bloqueo.
- **Cuidado con la caché**: una vez, Cloudflare cacheó una respuesta vieja de `/gestion-x7q2k9` (de antes de tener login) y la sirvió sin pedir contraseña. Se corrigió agregando `Cache-Control: no-store` a esa respuesta en el Worker, y purgando la caché manualmente desde el dashboard (Caching → Configuration → Purge). Si se vuelve a tocar esa parte del Worker, purgar caché después de desplegar, por las dudas.

## Otras cosas relevantes ya configuradas

- Dominio propio `ren3dpuq.cl` conectado (comprado en NIC Chile, DNS en Cloudflare).
- Cabeceras de seguridad (`_headers`): CSP, X-Frame-Options, HSTS, etc.
- SEO: `robots.txt`, `sitemap.xml`, datos estructurados (JSON-LD), meta tags Open Graph.
- Google Search Console y Google Business Profile ya verificados por el dueño.
- WhatsApp: +56 9 7998 1682. Instagram: @ren3dpuq.

## Cómo seguir trabajando

1. Cualquier cambio de código → editar archivos en esta carpeta → `npx wrangler deploy` (agregar `$env:Path += ";C:\Program Files\nodejs"` antes si `npx` no se reconoce en la sesión de PowerShell).
2. Cambios de base de datos → `npx wrangler d1 execute ren3dpuq-db --remote --command="..."` (o `--file=algo.sql`).
3. El dueño prefiere que se verifique todo en el sitio real (`ren3dpuq.cl`) después de cada despliegue, no solo confiar en que "debería funcionar".

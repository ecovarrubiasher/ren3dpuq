// ===== Ren3D — Worker: static site + products API + admin panel =====

const ADMIN_PATH = "/gestion-x7q2k9";
const SESSION_COOKIE = "ren3d_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_SECONDS = 15 * 60; // 15 min

function json(data, init = {}) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private" };
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
}

function rowToProduct(row) {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    category: row.category,
    icon: row.icon,
    img: row.img,
    tags: JSON.parse(row.tags || "[]"),
    price: row.price,
    priceLabel: row.price_label,
    priceFrom: !!row.price_from,
    sortOrder: row.sort_order,
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// ---------- auth helpers ----------

function toBase64Url(bytes) {
  let str = "";
  bytes.forEach(b => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

async function createSessionToken(env) {
  const expires = Date.now() + SESSION_TTL_MS;
  const sig = await hmacSign(env.ADMIN_SESSION_SECRET, String(expires));
  return `${expires}.${sig}`;
}

async function verifySessionToken(token, env) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiresStr, sig] = parts;
  const expected = await hmacSign(env.ADMIN_SESSION_SECRET, expiresStr);
  if (expected !== sig) return false;
  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return false;
  return true;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function isAuthenticated(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  return verifySessionToken(token, env);
}

function sessionCookieHeader(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=${ADMIN_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=${ADMIN_PATH}; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

async function checkAndBumpRateLimit(env, ip) {
  const key = `loginfail:${ip}`;
  const raw = await env.ren3dpuq_images.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= MAX_LOGIN_ATTEMPTS) return false;
  return true;
}

async function recordLoginFailure(env, ip) {
  const key = `loginfail:${ip}`;
  const raw = await env.ren3dpuq_images.get(key);
  const count = (raw ? parseInt(raw, 10) : 0) + 1;
  await env.ren3dpuq_images.put(key, String(count), { expirationTtl: LOGIN_WINDOW_SECONDS });
}

async function clearLoginFailures(env, ip) {
  await env.ren3dpuq_images.delete(`loginfail:${ip}`);
}

async function handleLogin(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await checkAndBumpRateLimit(env, ip);
  if (!allowed) {
    return json({ error: "Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    await recordLoginFailure(env, ip);
    return json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  await clearLoginFailures(env, ip);
  const token = await createSessionToken(env);
  return json({ ok: true }, {
    headers: { "Set-Cookie": sessionCookieHeader(token, SESSION_TTL_MS / 1000) },
  });
}

function handleLogout() {
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
}

// ---------- categories ----------

async function listCategories(env) {
  const { results } = await env.ren3dpuq_db
    .prepare("SELECT id, label FROM categories ORDER BY sort_order, label")
    .all();
  return results;
}

async function handleCategoriesApi(request, env, path) {
  const method = request.method;

  if (path === `${ADMIN_PATH}/api/categories` && method === "GET") {
    return json(await listCategories(env));
  }

  if (path === `${ADMIN_PATH}/api/categories` && method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!body.label || !body.label.trim()) {
      return json({ error: "Falta el nombre de la categoría." }, { status: 400 });
    }
    let id = slugify(body.label);
    if (!id) return json({ error: "Nombre de categoría inválido." }, { status: 400 });
    const exists = await env.ren3dpuq_db.prepare("SELECT id FROM categories WHERE id = ?").bind(id).first();
    if (exists) return json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 });
    const maxRow = await env.ren3dpuq_db.prepare("SELECT MAX(sort_order) as m FROM categories").first();
    const sortOrder = (maxRow && typeof maxRow.m === "number" ? maxRow.m : 0) + 1;
    await env.ren3dpuq_db.prepare("INSERT INTO categories (id, label, sort_order) VALUES (?, ?, ?)")
      .bind(id, body.label.trim(), sortOrder).run();
    return json({ id }, { status: 201 });
  }

  const idMatch = path.match(new RegExp(`^${ADMIN_PATH}/api/categories/([^/]+)$`));
  if (idMatch && (method === "PUT" || method === "PATCH")) {
    const id = decodeURIComponent(idMatch[1]);
    const body = await request.json().catch(() => ({}));
    if (!body.label || !body.label.trim()) {
      return json({ error: "Falta el nombre de la categoría." }, { status: 400 });
    }
    await env.ren3dpuq_db.prepare("UPDATE categories SET label=? WHERE id=?")
      .bind(body.label.trim(), id).run();
    return json({ ok: true });
  }

  if (idMatch && method === "DELETE") {
    const id = decodeURIComponent(idMatch[1]);
    const inUse = await env.ren3dpuq_db.prepare("SELECT COUNT(*) as c FROM products WHERE category = ?").bind(id).first();
    if (inUse && inUse.c > 0) {
      return json({ error: `No se puede eliminar: hay ${inUse.c} producto(s) usando esta categoría. Cámbialos de categoría primero.` }, { status: 409 });
    }
    await env.ren3dpuq_db.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "Ruta no encontrada" }, { status: 404 });
}

// ---------- products / uploads ----------

async function listProducts(env) {
  const { results } = await env.ren3dpuq_db
    .prepare("SELECT * FROM products ORDER BY sort_order, created_at")
    .all();
  return results.map(rowToProduct);
}

async function handleUpload(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop().toLowerCase() : "jpg";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const buffer = await file.arrayBuffer();
  await env.ren3dpuq_images.put(key, buffer, {
    metadata: { contentType: file.type || "image/jpeg" },
  });
  return json({ url: `/uploads/${key}` });
}

async function handleServeUpload(key, env) {
  const obj = await env.ren3dpuq_images.getWithMetadata(key, "arrayBuffer");
  if (!obj || !obj.value) {
    return new Response("No encontrado", { status: 404 });
  }
  const contentType = (obj.metadata && obj.metadata.contentType) || "application/octet-stream";
  return new Response(obj.value, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

async function handleAdminApi(request, env, path) {
  const method = request.method;

  if (path === `${ADMIN_PATH}/api/products` && method === "GET") {
    return json(await listProducts(env));
  }

  if (path === `${ADMIN_PATH}/api/products` && method === "POST") {
    const body = await request.json();
    if (!body.title) return json({ error: "Falta el título." }, { status: 400 });
    let id = slugify(body.title) || `producto-${Date.now()}`;
    const exists = await env.ren3dpuq_db.prepare("SELECT id FROM products WHERE id = ?").bind(id).first();
    if (exists) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
    const maxRow = await env.ren3dpuq_db.prepare("SELECT MAX(sort_order) as m FROM products").first();
    const sortOrder = (maxRow && typeof maxRow.m === "number" ? maxRow.m : 0) + 1;
    await env.ren3dpuq_db.prepare(
      `INSERT INTO products (id, title, description, category, icon, img, tags, price, price_label, price_from, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.title,
      body.desc || "",
      body.category || "personalizados",
      body.icon || "🎁",
      body.img || "",
      JSON.stringify(body.tags || []),
      body.price ?? null,
      body.priceLabel || "Consultar",
      body.priceFrom ? 1 : 0,
      sortOrder
    ).run();
    return json({ id }, { status: 201 });
  }

  const idMatch = path.match(new RegExp(`^${ADMIN_PATH}/api/products/([^/]+)$`));
  if (idMatch && (method === "PUT" || method === "PATCH")) {
    const id = decodeURIComponent(idMatch[1]);
    const body = await request.json();
    await env.ren3dpuq_db.prepare(
      `UPDATE products SET title=?, description=?, category=?, icon=?, img=?, tags=?, price=?, price_label=?, price_from=? WHERE id=?`
    ).bind(
      body.title,
      body.desc || "",
      body.category || "personalizados",
      body.icon || "🎁",
      body.img || "",
      JSON.stringify(body.tags || []),
      body.price ?? null,
      body.priceLabel || "Consultar",
      body.priceFrom ? 1 : 0,
      id
    ).run();
    return json({ ok: true });
  }

  if (idMatch && method === "DELETE") {
    const id = decodeURIComponent(idMatch[1]);
    await env.ren3dpuq_db.prepare("DELETE FROM products WHERE id=?").bind(id).run();
    return json({ ok: true });
  }

  if (path === `${ADMIN_PATH}/api/upload` && method === "POST") {
    return handleUpload(request, env);
  }

  return json({ error: "Ruta no encontrada" }, { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---- public routes ----
    if (path === "/api/products" && request.method === "GET") {
      return json(await listProducts(env));
    }

    if (path === "/api/categories" && request.method === "GET") {
      return json(await listCategories(env));
    }

    if (path.startsWith("/uploads/") && request.method === "GET") {
      const key = path.replace("/uploads/", "");
      return handleServeUpload(key, env);
    }

    // ---- login / logout (not protected, they ARE the auth gate) ----
    if (path === `${ADMIN_PATH}/api/login` && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (path === `${ADMIN_PATH}/api/logout` && request.method === "POST") {
      return handleLogout();
    }

    // ---- protected admin API ----
    if (path.startsWith(`${ADMIN_PATH}/api/`)) {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: "No autenticado" }, { status: 401 });
      }
      if (path.startsWith(`${ADMIN_PATH}/api/categories`)) {
        return handleCategoriesApi(request, env, path);
      }
      return handleAdminApi(request, env, path);
    }

    // ---- protected admin page ----
    if (path === ADMIN_PATH || path === `${ADMIN_PATH}/`) {
      const authed = await isAuthenticated(request, env);
      const assetResp = await env.ASSETS.fetch(new URL(authed ? "/admin.html" : "/login.html", request.url));
      const resp = new Response(assetResp.body, assetResp);
      resp.headers.set("Cache-Control", "no-store, private");
      return resp;
    }

    // admin.html / login.html must never be reachable by their real filenames
    if (path === "/admin.html" || path === "/login.html") {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};

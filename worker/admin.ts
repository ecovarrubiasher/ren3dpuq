/**
 * Panel privado de Ren3D (/admin): ventas, compras de insumos y stock de filamento.
 *
 * Se atiende directo desde el Worker, antes de pasar al sitio público, y guarda
 * todo en la base D1 enlazada como `DB`. El acceso se protege con el secreto
 * `ADMIN_PASSWORD` (se configura en Cloudflare, nunca en el código).
 */
import { adminAppPage, adminLoginPage, adminMessagePage } from "./admin-page";

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  meta?: { last_row_id?: number; changes?: number };
}
interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
interface D1Like {
  prepare(query: string): D1Stmt;
  batch(statements: D1Stmt[]): Promise<D1Result[]>;
}

export interface AdminEnv {
  DB?: D1Like;
  ADMIN_PASSWORD?: string;
}

const SESSION_COOKIE = "ren3d_admin";
const SESSION_DAYS = 30;
const MAX_FAILED_LOGINS = 8;
const FAILED_LOGIN_WINDOW_MINUTES = 15;
const MAX_BODY_BYTES = 64 * 1024;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    producto TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    valor INTEGER,
    estado TEXT NOT NULL DEFAULT 'Vendido',
    gramos REAL,
    nota TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    proveedor TEXT,
    pedido TEXT,
    categoria TEXT NOT NULL DEFAULT 'Filamento e insumos',
    detalle TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    envio INTEGER NOT NULL DEFAULT 0,
    descuento INTEGER NOT NULL DEFAULT 0,
    kg REAL NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS rollos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material TEXT NOT NULL DEFAULT 'PLA',
    color TEXT NOT NULL,
    marca TEXT,
    peso_inicial INTEGER NOT NULL DEFAULT 1000,
    restante INTEGER,
    costo INTEGER,
    estado TEXT NOT NULL DEFAULT 'Sellado',
    nota TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS consumos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    rollo_id INTEGER NOT NULL,
    gramos REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_intentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    creado TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

type FieldKind =
  | { kind: "text"; max: number; required?: boolean }
  | { kind: "date" }
  | { kind: "int"; min: number; nullable?: boolean; fallback?: number }
  | { kind: "num"; min: number; nullable?: boolean; fallback?: number }
  | { kind: "enum"; values: string[] };

const TABLES: Record<string, Record<string, FieldKind>> = {
  ventas: {
    fecha: { kind: "date" },
    producto: { kind: "text", max: 200, required: true },
    cantidad: { kind: "int", min: 1, fallback: 1 },
    valor: { kind: "int", min: 0, nullable: true },
    estado: { kind: "enum", values: ["Vendido", "En curso"] },
    gramos: { kind: "num", min: 0, nullable: true },
    nota: { kind: "text", max: 500 },
  },
  compras: {
    fecha: { kind: "date" },
    proveedor: { kind: "text", max: 100 },
    pedido: { kind: "text", max: 60 },
    categoria: {
      kind: "enum",
      values: ["Filamento e insumos", "Impresora", "Accesorios", "Otro"],
    },
    detalle: { kind: "text", max: 600 },
    subtotal: { kind: "int", min: 0, fallback: 0 },
    envio: { kind: "int", min: 0, fallback: 0 },
    descuento: { kind: "int", min: 0, fallback: 0 },
    kg: { kind: "num", min: 0, fallback: 0 },
  },
  rollos: {
    material: { kind: "text", max: 40, required: true },
    color: { kind: "text", max: 60, required: true },
    marca: { kind: "text", max: 60 },
    peso_inicial: { kind: "int", min: 1, fallback: 1000 },
    restante: { kind: "int", min: 0, nullable: true },
    costo: { kind: "int", min: 0, nullable: true },
    estado: { kind: "enum", values: ["Sellado", "En uso", "Agotado"] },
    nota: { kind: "text", max: 300 },
  },
};

class InputError extends Error {}

let schemaReady = false;

async function ensureSchema(db: D1Like): Promise<void> {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  schemaReady = true;
}

/** Punto de entrada: devuelve una respuesta para cualquier ruta bajo /admin. */
export async function handleAdmin(request: Request, env: AdminEnv): Promise<Response> {
  const url = new URL(request.url);
  const nonce = randomToken(16);

  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 8) {
    return html(
      adminMessagePage(
        nonce,
        "Panel sin configurar",
        "Falta el secreto ADMIN_PASSWORD (mínimo 8 caracteres) en el Worker de Cloudflare.",
      ),
      nonce,
      503,
    );
  }
  if (!env.DB) {
    return html(
      adminMessagePage(
        nonce,
        "Base de datos sin enlazar",
        "El Worker no tiene la base D1 enlazada con el nombre DB.",
      ),
      nonce,
      503,
    );
  }

  const path = url.pathname.replace(/\/+$/, "") || "/admin";
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (isWrite && !sameOrigin(request, url)) {
    return json({ error: "Origen no permitido" }, 403);
  }

  await ensureSchema(env.DB);

  if (path === "/admin/login" && request.method === "POST") {
    return login(request, env, env.DB);
  }

  const authed = await isAuthed(request, env.ADMIN_PASSWORD);

  if (path === "/admin/logout" && request.method === "POST") {
    return redirect("/admin", clearCookie());
  }

  if (path === "/admin") {
    if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
    return html(authed ? adminAppPage(nonce) : adminLoginPage(nonce, url.searchParams.get("e")), nonce);
  }

  if (!authed) return json({ error: "Sesión vencida" }, 401);

  try {
    if (path === "/admin/api/datos" && request.method === "GET") {
      return json(await readAll(env.DB));
    }
    const match = path.match(/^\/admin\/api\/(ventas|compras|rollos)(?:\/(\d+))?$/);
    if (match) {
      const table = match[1];
      const id = match[2] ? Number(match[2]) : null;
      if (request.method === "POST" && id === null) {
        return json(await createRow(env.DB, table, await readBody(request)), 201);
      }
      if (request.method === "PUT" && id !== null) {
        return json(await updateRow(env.DB, table, id, await readBody(request)));
      }
      if (request.method === "DELETE" && id !== null) {
        return json(await deleteRow(env.DB, table, id));
      }
      return json({ error: "Método no permitido" }, 405);
    }
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, 400);
    console.error("admin", error);
    return json({ error: "Error interno" }, 500);
  }

  return json({ error: "No encontrado" }, 404);
}

// ---------------------------------------------------------------- datos

async function readAll(db: D1Like) {
  const [ventas, compras, rollos] = await db.batch([
    db.prepare("SELECT * FROM ventas ORDER BY COALESCE(fecha, '') DESC, id DESC"),
    db.prepare("SELECT * FROM compras ORDER BY COALESCE(fecha, '') DESC, id DESC"),
    db.prepare("SELECT * FROM rollos ORDER BY estado = 'Agotado', material, color, id"),
  ]);
  return { ventas: ventas.results, compras: compras.results, rollos: rollos.results };
}

async function createRow(db: D1Like, table: string, body: Record<string, unknown>) {
  const row = sanitize(table, body);
  const consumo = table === "ventas" ? parseConsumo(body.consumo) : [];
  if (consumo.length && row.gramos === null) {
    row.gramos = consumo.reduce((sum, item) => sum + item.gramos, 0);
  }

  const columns = Object.keys(row);
  const result = await db
    .prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    )
    .bind(...columns.map((column) => row[column]))
    .run();
  const id = Number(result.meta?.last_row_id);

  if (consumo.length && Number.isFinite(id)) {
    const statements: D1Stmt[] = [];
    for (const item of consumo) {
      statements.push(
        db
          .prepare("INSERT INTO consumos (venta_id, rollo_id, gramos) VALUES (?, ?, ?)")
          .bind(id, item.rollo_id, item.gramos),
        db
          .prepare(
            `UPDATE rollos SET
               restante = MAX(0, COALESCE(restante, peso_inicial) - ?1),
               estado = CASE WHEN COALESCE(restante, peso_inicial) - ?1 <= 0 THEN 'Agotado' ELSE 'En uso' END
             WHERE id = ?2`,
          )
          .bind(item.gramos, item.rollo_id),
      );
    }
    await db.batch(statements);
  }
  return { ok: true, id };
}

async function updateRow(db: D1Like, table: string, id: number, body: Record<string, unknown>) {
  const row = sanitize(table, body);
  const columns = Object.keys(row);
  await db
    .prepare(`UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`)
    .bind(...columns.map((column) => row[column]), id)
    .run();
  return { ok: true, id };
}

async function deleteRow(db: D1Like, table: string, id: number) {
  if (table === "ventas") {
    // Al borrar una venta se devuelve al stock el filamento que había descontado.
    await db.batch([
      db
        .prepare(
          `UPDATE rollos SET
             restante = MIN(peso_inicial, COALESCE(restante, 0) + (SELECT SUM(gramos) FROM consumos WHERE venta_id = ?1 AND rollo_id = rollos.id)),
             estado = 'En uso'
           WHERE id IN (SELECT rollo_id FROM consumos WHERE venta_id = ?1)`,
        )
        .bind(id),
      db.prepare("DELETE FROM consumos WHERE venta_id = ?").bind(id),
      db.prepare("DELETE FROM ventas WHERE id = ?").bind(id),
    ]);
  } else if (table === "rollos") {
    await db.batch([
      db.prepare("DELETE FROM consumos WHERE rollo_id = ?").bind(id),
      db.prepare("DELETE FROM rollos WHERE id = ?").bind(id),
    ]);
  } else {
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  }
  return { ok: true };
}

function sanitize(table: string, body: Record<string, unknown>): Record<string, string | number | null> {
  const fields = TABLES[table];
  const row: Record<string, string | number | null> = {};
  for (const [name, field] of Object.entries(fields)) {
    const raw = body[name];
    const empty = raw === undefined || raw === null || raw === "";
    switch (field.kind) {
      case "text": {
        const value = empty ? "" : String(raw).trim().slice(0, field.max);
        if (field.required && !value) throw new InputError(`Falta el campo "${name}"`);
        row[name] = value || null;
        break;
      }
      case "date": {
        if (empty) {
          row[name] = null;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) && !Number.isNaN(Date.parse(String(raw)))) {
          row[name] = String(raw);
        } else {
          throw new InputError(`Fecha inválida en "${name}"`);
        }
        break;
      }
      case "int":
      case "num": {
        if (empty) {
          row[name] = field.nullable ? null : (field.fallback ?? 0);
          break;
        }
        const value = Number(raw);
        if (!Number.isFinite(value) || value < field.min || value > 1e9) {
          throw new InputError(`Número inválido en "${name}"`);
        }
        row[name] = field.kind === "int" ? Math.round(value) : value;
        break;
      }
      case "enum": {
        const value = empty ? field.values[0] : String(raw);
        if (!field.values.includes(value)) throw new InputError(`Valor inválido en "${name}"`);
        row[name] = value;
        break;
      }
    }
  }
  return row;
}

function parseConsumo(raw: unknown): { rollo_id: number; gramos: number }[] {
  if (!Array.isArray(raw)) return [];
  const items: { rollo_id: number; gramos: number }[] = [];
  for (const entry of raw.slice(0, 12)) {
    const rolloId = Number((entry as Record<string, unknown>)?.rollo_id);
    const gramos = Number((entry as Record<string, unknown>)?.gramos);
    if (!Number.isInteger(rolloId) || rolloId <= 0) continue;
    if (!Number.isFinite(gramos) || gramos <= 0 || gramos > 100000) {
      throw new InputError("Gramos de filamento inválidos");
    }
    items.push({ rollo_id: rolloId, gramos });
  }
  return items;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new InputError("Datos demasiado grandes");
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // cae al error de abajo
  }
  throw new InputError("Datos inválidos");
}

// ---------------------------------------------------------------- acceso

async function login(request: Request, env: AdminEnv, db: D1Like): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "desconocida";
  const recent = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM admin_intentos
       WHERE ip = ? AND creado > datetime('now', ?)`,
    )
    .bind(ip, `-${FAILED_LOGIN_WINDOW_MINUTES} minutes`)
    .first<{ total: number }>();
  if ((recent?.total ?? 0) >= MAX_FAILED_LOGINS) {
    return redirect("/admin?e=bloqueo");
  }

  const form = await request.formData().catch(() => null);
  const given = String(form?.get("clave") ?? "");
  const ok = given.length > 0 && (await safeEqual(given, env.ADMIN_PASSWORD ?? ""));
  if (!ok) {
    await db.batch([
      db.prepare("INSERT INTO admin_intentos (ip) VALUES (?)").bind(ip),
      db.prepare("DELETE FROM admin_intentos WHERE creado < datetime('now', '-1 day')"),
    ]);
    return redirect("/admin?e=clave");
  }

  const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
  const token = `${expires}.${await sign(String(expires), env.ADMIN_PASSWORD ?? "")}`;
  return redirect(
    "/admin",
    `${SESSION_COOKIE}=${token}; Path=/admin; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`,
  );
}

async function isAuthed(request: Request, password: string): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=(\\d+)\\.([0-9a-f]{64})(?:;|$)`));
  if (!match) return false;
  const [, expires, signature] = match;
  if (Number(expires) < Date.now()) return false;
  return safeEqual(signature, await sign(expires, password));
}

function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/** Las escrituras solo se aceptan desde la misma página (protección CSRF). */
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`ren3d-admin:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(value: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(value));
  return hex(new Uint8Array(signature));
}

/** Comparación en tiempo constante: compara las firmas HMAC, no los textos. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let index = 0; index < x.length; index += 1) diff |= x[index] ^ y[index];
  return diff === 0;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(length: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(length)));
}

// ---------------------------------------------------------------- respuestas

const BASE_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
};

function html(body: string, nonce: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...BASE_HEADERS,
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, "content-type": "application/json; charset=utf-8" },
  });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ ...BASE_HEADERS, location });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

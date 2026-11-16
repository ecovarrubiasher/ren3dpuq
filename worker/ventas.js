// ===== Ren3D — ventas, compras y stock de filamento =====
// Logica de datos para el panel /gestion-x7q2k9, sobre la misma base D1
// (env.ren3dpuq_db) que ya usan productos y categorias.

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
];

const TABLES = {
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
    categoria: { kind: "enum", values: ["Filamento e insumos", "Impresora", "Accesorios", "Otro"] },
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

export class VentasInputError extends Error {}

let schemaReady = false;

export async function ensureVentasSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  schemaReady = true;
}

export async function readVentasData(db) {
  const [ventas, compras, rollos] = await db.batch([
    db.prepare("SELECT * FROM ventas ORDER BY COALESCE(fecha, '') DESC, id DESC"),
    db.prepare("SELECT * FROM compras ORDER BY COALESCE(fecha, '') DESC, id DESC"),
    db.prepare("SELECT * FROM rollos ORDER BY estado = 'Agotado', material, color, id"),
  ]);
  return { ventas: ventas.results, compras: compras.results, rollos: rollos.results };
}

export async function createVentasRow(db, table, body) {
  const row = sanitize(table, body);
  const consumo = table === "ventas" ? parseConsumo(body.consumo) : [];
  if (consumo.length && row.gramos === null) {
    row.gramos = consumo.reduce((sum, item) => sum + item.gramos, 0);
  }

  const columns = Object.keys(row);
  const result = await db
    .prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .bind(...columns.map((column) => row[column]))
    .run();
  const id = Number(result.meta?.last_row_id);

  if (consumo.length && Number.isFinite(id)) {
    const statements = [];
    for (const item of consumo) {
      statements.push(
        db.prepare("INSERT INTO consumos (venta_id, rollo_id, gramos) VALUES (?, ?, ?)").bind(id, item.rollo_id, item.gramos),
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

export async function updateVentasRow(db, table, id, body) {
  const row = sanitize(table, body);
  const columns = Object.keys(row);
  await db
    .prepare(`UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`)
    .bind(...columns.map((column) => row[column]), id)
    .run();
  return { ok: true, id };
}

export async function deleteVentasRow(db, table, id) {
  if (table === "ventas") {
    // Al borrar una venta se devuelve al stock el filamento que habia descontado.
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

function sanitize(table, body) {
  const fields = TABLES[table];
  const row = {};
  for (const [name, field] of Object.entries(fields)) {
    const raw = body[name];
    const empty = raw === undefined || raw === null || raw === "";
    switch (field.kind) {
      case "text": {
        const value = empty ? "" : String(raw).trim().slice(0, field.max);
        if (field.required && !value) throw new VentasInputError(`Falta el campo "${name}"`);
        row[name] = value || null;
        break;
      }
      case "date": {
        if (empty) {
          row[name] = null;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) && !Number.isNaN(Date.parse(String(raw)))) {
          row[name] = String(raw);
        } else {
          throw new VentasInputError(`Fecha invalida en "${name}"`);
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
          throw new VentasInputError(`Numero invalido en "${name}"`);
        }
        row[name] = field.kind === "int" ? Math.round(value) : value;
        break;
      }
      case "enum": {
        const value = empty ? field.values[0] : String(raw);
        if (!field.values.includes(value)) throw new VentasInputError(`Valor invalido en "${name}"`);
        row[name] = value;
        break;
      }
    }
  }
  return row;
}

function parseConsumo(raw) {
  if (!Array.isArray(raw)) return [];
  const items = [];
  for (const entry of raw.slice(0, 12)) {
    const rolloId = Number(entry?.rollo_id);
    const gramos = Number(entry?.gramos);
    if (!Number.isInteger(rolloId) || rolloId <= 0) continue;
    if (!Number.isFinite(gramos) || gramos <= 0 || gramos > 100000) {
      throw new VentasInputError("Gramos de filamento invalidos");
    }
    items.push({ rollo_id: rolloId, gramos });
  }
  return items;
}

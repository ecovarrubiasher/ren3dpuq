/**
 * HTML del panel privado de Ren3D. Es una sola página con JavaScript simple:
 * no depende del sitio público ni de React, para que el panel siga funcionando
 * aunque cambie el diseño de la tienda.
 *
 * Importante: el código del navegador no usa plantillas con acento grave ni
 * barras invertidas, porque todo este archivo viaja dentro de una plantilla.
 */

const STYLES = `
:root { color-scheme: light dark; --bg:#f6f6f4; --card:#fff; --ink:#1c1c1a; --mute:#6b6b66; --line:#deded8; --accent:#c8102e; --ok:#1f7a4d; --warn:#b26a00; }
@media (prefers-color-scheme: dark) { :root { --bg:#141414; --card:#1e1e1d; --ink:#f0f0ec; --mute:#a3a39c; --line:#33332f; --accent:#ff4d5e; --ok:#5fd39a; --warn:#f0b354; } }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
header { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--line); background:var(--card); position:sticky; top:0; z-index:5; }
header h1 { font-size:17px; margin:0; flex:1; }
header h1 span { color:var(--accent); }
main { max-width:1080px; margin:0 auto; padding:16px; }
nav { display:flex; gap:6px; margin-bottom:16px; overflow-x:auto; }
button, .btn { font:inherit; border:1px solid var(--line); background:var(--card); color:var(--ink); padding:8px 14px; border-radius:8px; cursor:pointer; white-space:nowrap; }
button:hover { border-color:var(--mute); }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; font-weight:600; }
button.tab[aria-selected="true"] { background:var(--ink); color:var(--bg); border-color:var(--ink); }
button.small { padding:4px 9px; font-size:13px; }
button.danger { color:var(--accent); }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px; }
.card h2 { font-size:15px; margin:0 0 12px; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:16px; }
.stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; }
.stat b { display:block; font-size:21px; margin-top:2px; }
.stat small, .mute { color:var(--mute); }
.pos { color:var(--ok); } .neg { color:var(--accent); }
form.fields { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px 12px; }
label { display:flex; flex-direction:column; gap:4px; font-size:13px; color:var(--mute); }
label.wide { grid-column:1 / -1; }
input, select { font:inherit; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:8px 10px; width:100%; }
.actions { grid-column:1 / -1; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.consumo { grid-column:1 / -1; border:1px dashed var(--line); border-radius:8px; padding:10px; }
.consumo .row { display:grid; grid-template-columns:1fr 110px auto; gap:8px; margin-top:8px; }
.scroll { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--mute); white-space:nowrap; }
td.num, th.num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
td.ops { white-space:nowrap; text-align:right; }
.pill { display:inline-block; padding:1px 8px; border-radius:99px; font-size:12px; border:1px solid var(--line); }
.pill.ok { color:var(--ok); border-color:var(--ok); } .pill.warn { color:var(--warn); border-color:var(--warn); }
.bar { height:6px; background:var(--line); border-radius:99px; overflow:hidden; min-width:70px; margin-top:4px; }
.bar i { display:block; height:100%; background:var(--ok); }
.w0 { width:0 } .w10 { width:10% } .w20 { width:20% } .w30 { width:30% } .w40 { width:40% } .w50 { width:50% } .w60 { width:60% } .w70 { width:70% } .w80 { width:80% } .w90 { width:90% } .w100 { width:100% }
.msg { padding:10px 12px; border-radius:8px; margin-bottom:12px; border:1px solid var(--accent); color:var(--accent); }
.hidden { display:none; }
.login { max-width:340px; margin:12vh auto; }
.login form { display:flex; flex-direction:column; gap:12px; }
`;

function page(nonce: string, title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style nonce="${nonce}">${STYLES}</style>
</head>
<body>
${body}
${script ? `<script nonce="${nonce}">${script}</script>` : ""}
</body>
</html>`;
}

export function adminMessagePage(nonce: string, title: string, message: string): string {
  return page(
    nonce,
    "Ren3D · Panel",
    `<main class="login"><div class="card"><h2>${title}</h2><p class="mute">${message}</p></div></main>`,
  );
}

export function adminLoginPage(nonce: string, errorCode: string | null): string {
  const errors: Record<string, string> = {
    clave: "Clave incorrecta.",
    bloqueo: "Demasiados intentos. Espera 15 minutos.",
  };
  const error = errorCode && errors[errorCode] ? `<div class="msg">${errors[errorCode]}</div>` : "";
  return page(
    nonce,
    "Ren3D · Entrar",
    `<main class="login"><div class="card">
<h2>Panel Ren3D</h2>
${error}
<form method="post" action="/admin/login">
<label>Clave<input type="password" name="clave" autocomplete="current-password" required autofocus></label>
<button class="primary" type="submit">Entrar</button>
</form>
</div></main>`,
  );
}

export function adminAppPage(nonce: string): string {
  return page(
    nonce,
    "Ren3D · Panel",
    `<header>
<h1>Ren<span>3D</span> · Panel</h1>
<form method="post" action="/admin/logout"><button class="small" type="submit">Salir</button></form>
</header>
<main>
<nav id="tabs"></nav>
<div id="msg" class="msg hidden"></div>
<div id="view"><p class="mute">Cargando…</p></div>
</main>`,
    APP_SCRIPT,
  );
}

const APP_SCRIPT = `
(function () {
  "use strict";
  var TABS = [["resumen", "Resumen"], ["ventas", "Ventas"], ["compras", "Compras"], ["rollos", "Filamento"]];
  var FIELDS = {
    ventas: [
      { name: "fecha", label: "Fecha", type: "date", today: true },
      { name: "producto", label: "Producto", type: "text", required: true, wide: true },
      { name: "cantidad", label: "Cantidad", type: "number", min: 1, value: 1 },
      { name: "valor", label: "Valor total ($)", type: "number", min: 0 },
      { name: "estado", label: "Estado", type: "select", options: ["Vendido", "En curso"] },
      { name: "gramos", label: "Filamento usado (g)", type: "number", min: 0 },
      { name: "nota", label: "Nota", type: "text", wide: true }
    ],
    compras: [
      { name: "fecha", label: "Fecha", type: "date", today: true },
      { name: "proveedor", label: "Proveedor", type: "text" },
      { name: "pedido", label: "N° de pedido", type: "text" },
      { name: "categoria", label: "Categoría", type: "select", options: ["Filamento e insumos", "Impresora", "Accesorios", "Otro"] },
      { name: "detalle", label: "Detalle", type: "text", wide: true },
      { name: "subtotal", label: "Subtotal ($)", type: "number", min: 0 },
      { name: "envio", label: "Envío ($)", type: "number", min: 0 },
      { name: "descuento", label: "Descuento ($)", type: "number", min: 0 },
      { name: "kg", label: "Filamento (kg)", type: "number", min: 0, step: "0.1" }
    ],
    rollos: [
      { name: "material", label: "Material", type: "text", required: true, value: "PLA" },
      { name: "color", label: "Color", type: "text", required: true },
      { name: "marca", label: "Marca", type: "text" },
      { name: "peso_inicial", label: "Peso inicial (g)", type: "number", min: 1, value: 1000 },
      { name: "restante", label: "Restante (g)", type: "number", min: 0 },
      { name: "costo", label: "Costo ($)", type: "number", min: 0 },
      { name: "estado", label: "Estado", type: "select", options: ["Sellado", "En uso", "Agotado"] },
      { name: "nota", label: "Nota", type: "text", wide: true }
    ]
  };
  var NAMES = { ventas: "venta", compras: "compra", rollos: "rollo" };

  var data = { ventas: [], compras: [], rollos: [] };
  var tab = "resumen";
  var editing = null;
  var money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  var view = document.getElementById("view");
  var msg = document.getElementById("msg");

  function el(tag, props, children) {
    var node = document.createElement(tag);
    var key;
    props = props || {};
    for (key in props) {
      if (key === "class") node.className = props[key];
      else if (key === "text") node.textContent = props[key];
      else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), props[key]);
      else if (props[key] !== undefined && props[key] !== null) node.setAttribute(key, props[key]);
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clp(value) { return value === null || value === undefined ? "—" : money.format(value); }
  function num(value) { return Number(value) || 0; }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function showError(text) { msg.textContent = text; msg.classList.remove("hidden"); }
  function clearError() { msg.classList.add("hidden"); }

  function api(method, path, body) {
    return fetch("/admin/api/" + path, {
      method: method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin"
    }).then(function (response) {
      if (response.status === 401) { location.reload(); throw new Error("Sesión vencida"); }
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error(payload.error || "Error");
        return payload;
      });
    });
  }

  function load() {
    return api("GET", "datos").then(function (payload) { data = payload; render(); })
      .catch(function (error) { showError(error.message); });
  }

  function totalCompra(row) { return num(row.subtotal) + num(row.envio) - num(row.descuento); }

  function resumen() {
    var vendidas = data.ventas.filter(function (v) { return v.estado === "Vendido"; });
    var cobrado = vendidas.reduce(function (s, v) { return s + num(v.valor); }, 0);
    var enCurso = data.ventas.filter(function (v) { return v.estado !== "Vendido"; })
      .reduce(function (s, v) { return s + num(v.valor); }, 0);
    var productos = data.ventas.reduce(function (s, v) { return s + num(v.cantidad); }, 0);
    var porCategoria = {};
    var comprado = 0, envios = 0, kg = 0;
    data.compras.forEach(function (c) {
      var total = totalCompra(c);
      porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + total;
      comprado += total; envios += num(c.envio); kg += num(c.kg);
    });
    var insumos = porCategoria["Filamento e insumos"] || 0;
    var costoKg = kg > 0 ? insumos / kg : 0;
    var conGramos = vendidas.filter(function (v) { return num(v.gramos) > 0 && num(v.valor) > 0; });
    var ventaMedida = conGramos.reduce(function (s, v) { return s + num(v.valor); }, 0);
    var costoMedido = conGramos.reduce(function (s, v) { return s + num(v.gramos) / 1000 * costoKg; }, 0);
    var margen = ventaMedida > 0 ? Math.round((ventaMedida - costoMedido) / ventaMedida * 100) : null;
    var stock = 0, sinPesar = 0;
    data.rollos.forEach(function (r) {
      if (r.estado === "Agotado") return;
      if (r.restante === null || r.restante === undefined) { sinPesar += 1; stock += num(r.peso_inicial); }
      else stock += num(r.restante);
    });
    var meses = {};
    vendidas.forEach(function (v) {
      var key = v.fecha ? v.fecha.slice(0, 7) : "Sin fecha";
      meses[key] = meses[key] || { total: 0, pedidos: 0 };
      meses[key].total += num(v.valor); meses[key].pedidos += 1;
    });
    return { cobrado: cobrado, enCurso: enCurso, productos: productos, pedidos: vendidas.length, porCategoria: porCategoria,
      comprado: comprado, envios: envios, kg: kg, costoKg: costoKg, margen: margen, medidas: conGramos.length,
      stock: stock, sinPesar: sinPesar, meses: meses };
  }

  function stat(label, value, note, tone) {
    return el("div", { class: "stat" }, [
      el("small", { text: label }),
      el("b", { text: value, class: tone || "" }),
      note ? el("small", { text: note }) : null
    ]);
  }

  function renderResumen() {
    var r = resumen();
    var balance = r.cobrado - r.comprado;
    var cards = el("div", { class: "grid" }, [
      stat("Ventas cobradas", clp(r.cobrado), r.pedidos + (r.pedidos === 1 ? " pedido · " : " pedidos · ") + r.productos + " productos"),
      stat("Ventas en curso", clp(r.enCurso), "Por cobrar"),
      stat("Total comprado", clp(r.comprado), "Incluye " + clp(r.envios) + " en envíos"),
      stat("Ventas menos compras", clp(balance), "Cobrado menos todo lo comprado", balance >= 0 ? "pos" : "neg"),
      stat("Costo del filamento", r.kg > 0 ? clp(Math.round(r.costoKg)) + " / kg" : "—", r.kg + " kg comprados, con envío"),
      stat("Margen sobre material", r.margen === null ? "—" : r.margen + "%",
        r.medidas ? "Según " + r.medidas + (r.medidas === 1 ? " venta" : " ventas") + " con gramos anotados" : "Anota los gramos en las ventas",
        r.margen === null ? "" : (r.margen >= 50 ? "pos" : "neg")),
      stat("Filamento en stock", (r.stock / 1000).toFixed(1) + " kg", r.sinPesar ? r.sinPesar + " rollos sin pesar (cuentan llenos)" : "Rollos no agotados")
    ]);
    var categorias = Object.keys(r.porCategoria).sort();
    var meses = Object.keys(r.meses).sort().reverse();
    view.replaceChildren(
      cards,
      el("div", { class: "card" }, [
        el("h2", { text: "Compras por categoría" }),
        categorias.length ? el("table", {}, [el("tbody", {}, categorias.map(function (name) {
          return el("tr", {}, [el("td", { text: name }), el("td", { class: "num", text: clp(r.porCategoria[name]) })]);
        }))]) : el("p", { class: "mute", text: "Sin compras registradas." })
      ]),
      el("div", { class: "card" }, [
        el("h2", { text: "Ventas cobradas por mes" }),
        meses.length ? el("table", {}, [
          el("thead", {}, [el("tr", {}, [el("th", { text: "Mes" }), el("th", { class: "num", text: "Pedidos" }), el("th", { class: "num", text: "Total" })])]),
          el("tbody", {}, meses.map(function (key) {
            return el("tr", {}, [el("td", { text: key }), el("td", { class: "num", text: String(r.meses[key].pedidos) }), el("td", { class: "num", text: clp(r.meses[key].total) })]);
          }))
        ]) : el("p", { class: "mute", text: "Sin ventas registradas." })
      ])
    );
  }

  function rolloLabel(r) {
    var left = r.restante === null || r.restante === undefined ? "sin pesar" : r.restante + " g";
    return r.material + " " + r.color + (r.marca ? " · " + r.marca : "") + " (" + left + ")";
  }

  function consumoBlock() {
    var disponibles = data.rollos.filter(function (r) { return r.estado !== "Agotado"; });
    var rows = el("div", {});
    function addRow() {
      var select = el("select", { "data-consumo": "rollo" }, [el("option", { value: "", text: "Elegir rollo…" })].concat(
        disponibles.map(function (r) { return el("option", { value: String(r.id), text: rolloLabel(r) }); })));
      var grams = el("input", { type: "number", min: "0", step: "1", placeholder: "gramos", "data-consumo": "gramos", inputmode: "decimal" });
      var row = el("div", { class: "row" }, [select, grams, el("button", { type: "button", class: "small", text: "Quitar", onclick: function () { row.remove(); } })]);
      rows.appendChild(row);
    }
    var block = el("div", { class: "consumo" }, [
      el("small", { class: "mute", text: "Descontar filamento del stock (opcional). Un rollo por color usado." }),
      rows,
      el("div", { class: "actions" }, [el("button", { type: "button", class: "small", text: "+ Agregar rollo", onclick: addRow })])
    ]);
    if (!disponibles.length) {
      block.replaceChildren(el("small", { class: "mute", text: "Agrega rollos en la pestaña Filamento para poder descontar stock." }));
    }
    return block;
  }

  function buildForm(table) {
    var current = editing && editing.table === table ? editing.row : null;
    var form = el("form", { class: "fields" });
    FIELDS[table].forEach(function (field) {
      var input;
      var value = current ? current[field.name] : (field.today ? today() : field.value);
      if (field.type === "select") {
        input = el("select", { name: field.name }, field.options.map(function (option) { return el("option", { value: option, text: option }); }));
        if (value) input.value = value;
      } else {
        input = el("input", { name: field.name, type: field.type, min: field.min, step: field.step || (field.type === "number" ? "1" : null), inputmode: field.type === "number" ? "decimal" : null });
        if (field.required) input.required = true;
        if (value !== null && value !== undefined) input.value = value;
      }
      form.appendChild(el("label", { class: field.wide ? "wide" : "" }, [field.label, input]));
    });
    if (table === "ventas" && !current) form.appendChild(consumoBlock());
    form.appendChild(el("div", { class: "actions" }, [
      el("button", { class: "primary", type: "submit", text: current ? "Guardar cambios" : "Agregar " + NAMES[table] }),
      current ? el("button", { type: "button", text: "Cancelar", onclick: function () { editing = null; render(); } }) : null
    ]));
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();
      var body = {};
      FIELDS[table].forEach(function (field) { body[field.name] = form.elements[field.name].value; });
      if (table === "ventas" && !current) {
        body.consumo = [];
        form.querySelectorAll(".consumo .row").forEach(function (row) {
          var rollo = row.querySelector("[data-consumo=rollo]").value;
          var gramos = row.querySelector("[data-consumo=gramos]").value;
          if (rollo && Number(gramos) > 0) body.consumo.push({ rollo_id: Number(rollo), gramos: Number(gramos) });
        });
      }
      var request = current ? api("PUT", table + "/" + current.id, body) : api("POST", table, body);
      request.then(function () { editing = null; return load(); }).catch(function (error) { showError(error.message); });
    });
    return el("div", { class: "card" }, [el("h2", { text: (current ? "Editar " : "Nueva ") + NAMES[table] }), form]);
  }

  function ops(table, row) {
    return el("td", { class: "ops" }, [
      el("button", { class: "small", text: "Editar", onclick: function () { editing = { table: table, row: row }; render(); window.scrollTo(0, 0); } }),
      " ",
      el("button", { class: "small danger", text: "Borrar", onclick: function () {
        if (!confirm("¿Borrar este registro? No se puede deshacer.")) return;
        clearError();
        api("DELETE", table + "/" + row.id).then(load).catch(function (error) { showError(error.message); });
      } })
    ]);
  }

  function listCard(title, head, rows, empty) {
    return el("div", { class: "card" }, [
      el("h2", { text: title }),
      rows.length ? el("div", { class: "scroll" }, [el("table", {}, [
        el("thead", {}, [el("tr", {}, head.map(function (h) { return el("th", { class: h[1] || "", text: h[0] }); }))]),
        el("tbody", {}, rows)
      ])]) : el("p", { class: "mute", text: empty })
    ]);
  }

  function renderVentas() {
    var rows = data.ventas.map(function (v) {
      return el("tr", {}, [
        el("td", { text: v.fecha || "—" }),
        el("td", {}, [v.producto, v.nota ? el("div", { class: "mute", text: v.nota }) : null]),
        el("td", { class: "num", text: String(v.cantidad) }),
        el("td", { class: "num", text: clp(v.valor) }),
        el("td", { class: "num", text: v.gramos ? Math.round(v.gramos) + " g" : "—" }),
        el("td", {}, [el("span", { class: "pill " + (v.estado === "Vendido" ? "ok" : "warn"), text: v.estado })]),
        ops("ventas", v)
      ]);
    });
    view.replaceChildren(buildForm("ventas"), listCard("Ventas (" + data.ventas.length + ")",
      [["Fecha"], ["Producto"], ["Cant.", "num"], ["Valor", "num"], ["Filamento", "num"], ["Estado"], [""]], rows, "Todavía no hay ventas."));
  }

  function renderCompras() {
    var rows = data.compras.map(function (c) {
      return el("tr", {}, [
        el("td", { text: c.fecha || "—" }),
        el("td", {}, [c.categoria, el("div", { class: "mute", text: [c.proveedor, c.pedido ? "#" + c.pedido : ""].filter(Boolean).join(" · ") })]),
        el("td", { text: c.detalle || "" }),
        el("td", { class: "num", text: c.kg ? c.kg + " kg" : "—" }),
        el("td", { class: "num", text: clp(c.envio) }),
        el("td", { class: "num", text: clp(totalCompra(c)) }),
        ops("compras", c)
      ]);
    });
    view.replaceChildren(buildForm("compras"), listCard("Compras (" + data.compras.length + ")",
      [["Fecha"], ["Categoría"], ["Detalle"], ["Filamento", "num"], ["Envío", "num"], ["Total", "num"], [""]], rows, "Todavía no hay compras."));
  }

  function renderRollos() {
    var rows = data.rollos.map(function (r) {
      var known = r.restante !== null && r.restante !== undefined;
      var pct = known && r.peso_inicial ? Math.max(0, Math.min(100, Math.round(r.restante / r.peso_inicial * 10) * 10)) : 100;
      return el("tr", {}, [
        el("td", {}, [r.material + " " + r.color, r.nota ? el("div", { class: "mute", text: r.nota }) : null]),
        el("td", { text: r.marca || "—" }),
        el("td", {}, [known ? r.restante + " g de " + r.peso_inicial + " g" : "Sin pesar",
          el("div", { class: "bar" }, [el("i", { class: "w" + pct })])]),
        el("td", { class: "num", text: clp(r.costo) }),
        el("td", {}, [el("span", { class: "pill " + (r.estado === "Agotado" ? "warn" : "ok"), text: r.estado })]),
        ops("rollos", r)
      ]);
    });
    view.replaceChildren(buildForm("rollos"), listCard("Rollos (" + data.rollos.length + ")",
      [["Filamento"], ["Marca"], ["Restante"], ["Costo", "num"], ["Estado"], [""]], rows, "Todavía no hay rollos."));
  }

  function render() {
    var tabs = document.getElementById("tabs");
    tabs.replaceChildren.apply(tabs, TABS.map(function (item) {
      return el("button", { class: "tab", type: "button", "aria-selected": String(tab === item[0]), text: item[1],
        onclick: function () { tab = item[0]; editing = null; clearError(); render(); } });
    }));
    if (tab === "ventas") renderVentas();
    else if (tab === "compras") renderCompras();
    else if (tab === "rollos") renderRollos();
    else renderResumen();
  }

  render();
  load();
})();
`;

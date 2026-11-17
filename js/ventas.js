// ===== Ren3D — panel de ventas, compras y stock de filamento =====
// Vive dentro del mismo admin.html (pestaña "Ventas"); reusa la sesion
// de /gestion-x7q2k9 ya validada por admin.js, no tiene login propio.

(function () {
  "use strict";

  var DATA_API = "/gestion-x7q2k9/api/ventas-data";
  var ROW_API = "/gestion-x7q2k9/api/ventas";

  var TABS = [["resumen", "Resumen"], ["ventas", "Ventas"], ["compras", "Compras"], ["rollos", "Filamento"]];
  var FIELDS = {
    ventas: [
      { name: "fecha", label: "Fecha", type: "date", today: true },
      { name: "producto", label: "Producto", type: "text", required: true, wide: true },
      { name: "cantidad", label: "Cantidad", type: "number", min: 1, value: 1 },
      { name: "valor", label: "Valor total ($)", type: "number", min: 0 },
      { name: "estado", label: "Estado", type: "select", options: ["Vendido", "En curso"] },
      { name: "gramos", label: "Filamento usado (g)", type: "number", min: 0 },
      { name: "nota", label: "Nota", type: "text", wide: true },
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
      { name: "kg", label: "Filamento (kg)", type: "number", min: 0, step: "0.1" },
    ],
    rollos: [
      { name: "material", label: "Material", type: "text", required: true, value: "PLA" },
      { name: "color", label: "Color", type: "text", required: true },
      { name: "marca", label: "Marca", type: "text" },
      { name: "peso_inicial", label: "Peso inicial (g)", type: "number", min: 1, value: 1000 },
      { name: "restante", label: "Restante (g)", type: "number", min: 0 },
      { name: "costo", label: "Costo ($)", type: "number", min: 0 },
      { name: "estado", label: "Estado", type: "select", options: ["Sellado", "En uso", "Agotado"] },
      { name: "nota", label: "Nota", type: "text", wide: true },
    ],
  };
  var NAMES = { ventas: "venta", compras: "compra", rollos: "rollo" };

  var data = { ventas: [], compras: [], rollos: [] };
  var tab = "resumen";
  var editing = null;
  var started = false;
  var loaded = false;
  var money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

  function q(id) { return document.getElementById(id); }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    for (var key in props) {
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

  function showError(text) {
    var msg = q("ventasMsg");
    msg.textContent = text;
    msg.hidden = false;
    msg.classList.add("admin-msg-error");
    msg.classList.remove("admin-msg-ok");
  }
  function clearError() { q("ventasMsg").hidden = true; }

  function api(method, path, body) {
    return fetch(path, {
      method: method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    }).then(function (response) {
      if (response.status === 401) { window.location.reload(); throw new Error("Sesión vencida"); }
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error(payload.error || "Error");
        return payload;
      });
    });
  }

  function load() {
    return api("GET", DATA_API).then(function (payload) { data = payload; loaded = true; render(); })
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
    return el("div", { class: "v-stat" }, [
      el("small", { text: label }),
      el("b", { text: value, class: tone || "" }),
      note ? el("small", { text: note }) : null,
    ]);
  }

  function renderResumen(view) {
    var r = resumen();
    var balance = r.cobrado - r.comprado;
    var cards = el("div", { class: "v-grid" }, [
      stat("Ventas cobradas", clp(r.cobrado), r.pedidos + (r.pedidos === 1 ? " pedido · " : " pedidos · ") + r.productos + " productos"),
      stat("Ventas en curso", clp(r.enCurso), "Por cobrar"),
      stat("Total comprado", clp(r.comprado), "Incluye " + clp(r.envios) + " en envíos"),
      stat("Flujo de caja", clp(balance), "Dinero que entró menos el que salió", balance >= 0 ? "v-pos" : "v-neg"),
      stat("Costo del filamento", r.kg > 0 ? clp(Math.round(r.costoKg)) + " / kg" : "—", r.kg + " kg comprados, con envío"),
      stat("Margen sobre material", r.margen === null ? "—" : r.margen + "%",
        r.medidas ? "Según " + r.medidas + (r.medidas === 1 ? " venta" : " ventas") + " con gramos anotados" : "Anota los gramos en las ventas",
        r.margen === null ? "" : (r.margen >= 50 ? "v-pos" : "v-neg")),
      stat("Filamento en stock", (r.stock / 1000).toFixed(1) + " kg", r.sinPesar ? r.sinPesar + " rollos sin pesar (cuentan llenos)" : "Rollos no agotados"),
    ]);
    var categorias = Object.keys(r.porCategoria).sort();
    var meses = Object.keys(r.meses).sort().reverse();
    view.replaceChildren(
      cards,
      el("div", { class: "admin-form-card" }, [
        el("h2", { text: "Compras por categoría" }),
        categorias.length ? el("table", { class: "v-table" }, [el("tbody", {}, categorias.map(function (name) {
          return el("tr", {}, [el("td", { text: name }), el("td", { class: "v-num", text: clp(r.porCategoria[name]) })]);
        }))]) : el("p", { class: "mute", text: "Sin compras registradas." }),
      ]),
      el("div", { class: "admin-form-card" }, [
        el("h2", { text: "Ventas cobradas por mes" }),
        meses.length ? el("table", { class: "v-table" }, [
          el("thead", {}, [el("tr", {}, [el("th", { text: "Mes" }), el("th", { class: "v-num", text: "Pedidos" }), el("th", { class: "v-num", text: "Total" })])]),
          el("tbody", {}, meses.map(function (key) {
            return el("tr", {}, [el("td", { text: key }), el("td", { class: "v-num", text: String(r.meses[key].pedidos) }), el("td", { class: "v-num", text: clp(r.meses[key].total) })]);
          })),
        ]) : el("p", { class: "mute", text: "Sin ventas registradas." }),
      ]),
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
      var row = el("div", { class: "v-consumo-row" }, [select, grams, el("button", { type: "button", class: "btn btn-outline", text: "Quitar", onclick: function () { row.remove(); } })]);
      rows.appendChild(row);
    }
    var block = el("div", { class: "v-consumo" }, [
      el("small", { class: "mute", text: "Descontar filamento del stock (opcional). Un rollo por color usado." }),
      rows,
      el("div", { class: "admin-form-actions" }, [el("button", { type: "button", class: "btn btn-outline", text: "+ Agregar rollo", onclick: addRow })]),
    ]);
    if (!disponibles.length) {
      block.replaceChildren(el("small", { class: "mute", text: "Agrega rollos en la pestaña Filamento para poder descontar stock." }));
    }
    return block;
  }

  function buildForm(table) {
    var current = editing && editing.table === table ? editing.row : null;
    var form = el("form", { class: "admin-form v-fields" });
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
      form.appendChild(el("label", { class: field.wide ? "v-wide" : "" }, [field.label, input]));
    });
    if (table === "ventas" && !current) form.appendChild(consumoBlock());
    form.appendChild(el("div", { class: "admin-form-actions v-wide" }, [
      el("button", { class: "btn btn-primary", type: "submit", text: current ? "Guardar cambios" : "Agregar " + NAMES[table] }),
      current ? el("button", { class: "btn btn-outline", type: "button", text: "Cancelar", onclick: function () { editing = null; render(); } }) : null,
    ]));
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();
      var body = {};
      FIELDS[table].forEach(function (field) { body[field.name] = form.elements[field.name].value; });
      if (table === "ventas" && !current) {
        body.consumo = [];
        form.querySelectorAll(".v-consumo-row").forEach(function (row) {
          var rollo = row.querySelector("[data-consumo=rollo]").value;
          var gramos = row.querySelector("[data-consumo=gramos]").value;
          if (rollo && Number(gramos) > 0) body.consumo.push({ rollo_id: Number(rollo), gramos: Number(gramos) });
        });
      }
      var request = current ? api("PUT", ROW_API + "/" + table + "/" + current.id, body) : api("POST", ROW_API + "/" + table, body);
      request.then(function () { editing = null; return load(); }).catch(function (error) { showError(error.message); });
    });
    return el("div", { class: "admin-form-card" }, [el("h2", { text: (current ? "Editar " : "Nueva ") + NAMES[table] }), form]);
  }

  function ops(table, row) {
    return el("td", { class: "v-ops" }, [
      el("button", { class: "btn btn-outline", type: "button", text: "Editar", onclick: function () { editing = { table: table, row: row }; render(); window.scrollTo(0, 0); } }),
      " ",
      el("button", { class: "btn admin-delete-btn", type: "button", text: "Borrar", onclick: function () {
        if (!confirm("¿Borrar este registro? No se puede deshacer.")) return;
        clearError();
        api("DELETE", ROW_API + "/" + table + "/" + row.id).then(load).catch(function (error) { showError(error.message); });
      } }),
    ]);
  }

  function listCard(title, head, rows, empty) {
    return el("div", { class: "admin-list-card" }, [
      el("h2", { text: title }),
      rows.length ? el("div", { class: "v-scroll" }, [el("table", { class: "v-table" }, [
        el("thead", {}, [el("tr", {}, head.map(function (h) {
          var label = h[0], extraClass = h[1] || "", onClick = h[2], suffix = h[3] || "";
          var props = { class: extraClass + (onClick ? " v-sortable" : ""), text: label + suffix };
          if (onClick) props.onclick = onClick;
          return el("th", props);
        }))]),
        el("tbody", {}, rows),
      ])]) : el("p", { class: "mute", text: empty }),
    ]);
  }

  // null = orden normal (por fecha); "curso" agrupa "En curso" arriba;
  // "vendido" agrupa "Vendido" arriba. Clic en el encabezado "Estado" rota entre los tres.
  var ventasEstadoSort = null;

  function toggleVentasEstadoSort() {
    ventasEstadoSort = ventasEstadoSort === null ? "curso" : ventasEstadoSort === "curso" ? "vendido" : null;
    render();
  }

  function sortedVentas() {
    if (!ventasEstadoSort) return data.ventas;
    var want = ventasEstadoSort === "curso" ? "En curso" : "Vendido";
    var primero = data.ventas.filter(function (v) { return v.estado === want; });
    var despues = data.ventas.filter(function (v) { return v.estado !== want; });
    return primero.concat(despues);
  }

  function renderVentas(view) {
    var rows = sortedVentas().map(function (v) {
      return el("tr", {}, [
        el("td", { text: v.fecha || "—" }),
        el("td", {}, [v.producto, v.nota ? el("div", { class: "mute", text: v.nota }) : null]),
        el("td", { class: "v-num", text: String(v.cantidad) }),
        el("td", { class: "v-num", text: clp(v.valor) }),
        el("td", { class: "v-num", text: v.gramos ? Math.round(v.gramos) + " g" : "—" }),
        el("td", {}, [el("span", { class: "v-pill " + (v.estado === "Vendido" ? "v-ok" : "v-warn"), text: v.estado })]),
        ops("ventas", v),
      ]);
    });
    var estadoSuffix = ventasEstadoSort === "curso" ? " ▲ en curso" : ventasEstadoSort === "vendido" ? " ▲ vendido" : " ⇅";
    view.replaceChildren(buildForm("ventas"), listCard("Ventas (" + data.ventas.length + ")",
      [["Fecha"], ["Producto"], ["Cant.", "v-num"], ["Valor", "v-num"], ["Filamento", "v-num"],
        ["Estado", "", toggleVentasEstadoSort, estadoSuffix], [""]], rows, "Todavía no hay ventas."));
  }

  // Ordenamiento de la tabla de Compras: clic en un encabezado ordena por esa
  // columna (asc), un segundo clic invierte a desc, y cambiar de columna
  // reinicia a asc.
  var comprasSort = { col: null, dir: 1 };

  var COMPRAS_SORT_GETTERS = {
    fecha: function (c) { return c.fecha || ""; },
    categoria: function (c) { return (c.categoria || "").toLowerCase(); },
    detalle: function (c) { return (c.detalle || "").toLowerCase(); },
    kg: function (c) { return num(c.kg); },
    envio: function (c) { return num(c.envio); },
    total: function (c) { return totalCompra(c); },
  };

  function toggleComprasSort(col) {
    if (comprasSort.col === col) comprasSort.dir *= -1;
    else { comprasSort.col = col; comprasSort.dir = 1; }
    render();
  }

  function sortedCompras() {
    if (!comprasSort.col) return data.compras;
    var get = COMPRAS_SORT_GETTERS[comprasSort.col];
    var dir = comprasSort.dir;
    return data.compras.slice().sort(function (a, b) {
      var va = get(a), vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  function comprasHead(label, col, extraClass) {
    var suffix = comprasSort.col === col ? (comprasSort.dir === 1 ? " ▲" : " ▼") : "";
    return [label, extraClass || "", function () { toggleComprasSort(col); }, suffix];
  }

  function renderCompras(view) {
    var rows = sortedCompras().map(function (c) {
      return el("tr", {}, [
        el("td", { text: c.fecha || "—" }),
        el("td", {}, [c.categoria, el("div", { class: "mute", text: [c.proveedor, c.pedido ? "#" + c.pedido : ""].filter(Boolean).join(" · ") })]),
        el("td", { text: c.detalle || "" }),
        el("td", { class: "v-num", text: c.kg ? c.kg + " kg" : "—" }),
        el("td", { class: "v-num", text: clp(c.envio) }),
        el("td", { class: "v-num", text: clp(totalCompra(c)) }),
        ops("compras", c),
      ]);
    });
    view.replaceChildren(buildForm("compras"), listCard("Compras (" + data.compras.length + ")",
      [
        comprasHead("Fecha", "fecha"),
        comprasHead("Categoría", "categoria"),
        comprasHead("Detalle", "detalle"),
        comprasHead("Filamento", "kg", "v-num"),
        comprasHead("Envío", "envio", "v-num"),
        comprasHead("Total", "total", "v-num"),
        [""],
      ],
      rows, "Todavía no hay compras."));
  }

  function renderRollos(view) {
    var rows = data.rollos.map(function (r) {
      var known = r.restante !== null && r.restante !== undefined;
      var pct = known && r.peso_inicial ? Math.max(0, Math.min(100, Math.round(r.restante / r.peso_inicial * 10) * 10)) : 100;
      return el("tr", {}, [
        el("td", {}, [r.material + " " + r.color, r.nota ? el("div", { class: "mute", text: r.nota }) : null]),
        el("td", { text: r.marca || "—" }),
        el("td", {}, [known ? r.restante + " g de " + r.peso_inicial + " g" : "Sin pesar",
          el("div", { class: "v-bar" }, [el("i", { class: "v-w" + pct })])]),
        el("td", { class: "v-num", text: clp(r.costo) }),
        el("td", {}, [el("span", { class: "v-pill " + (r.estado === "Agotado" ? "v-warn" : "v-ok"), text: r.estado })]),
        ops("rollos", r),
      ]);
    });
    view.replaceChildren(buildForm("rollos"), listCard("Rollos (" + data.rollos.length + ")",
      [["Filamento"], ["Marca"], ["Restante"], ["Costo", "v-num"], ["Estado"], [""]], rows, "Todavía no hay rollos."));
  }

  function render() {
    var nav = q("ventasSubnav");
    nav.replaceChildren.apply(nav, TABS.map(function (item) {
      return el("button", { class: "admin-tab" + (tab === item[0] ? " active" : ""), type: "button", text: item[1],
        onclick: function () { tab = item[0]; editing = null; clearError(); render(); } });
    }));
    var view = q("ventasView");
    if (!loaded) {
      view.replaceChildren(el("p", { class: "mute", text: "Cargando…" }));
      return;
    }
    if (tab === "ventas") renderVentas(view);
    else if (tab === "compras") renderCompras(view);
    else if (tab === "rollos") renderRollos(view);
    else renderResumen(view);
  }

  window.initVentasPanel = function () {
    if (started) return;
    started = true;
    render();
    load();
  };
})();

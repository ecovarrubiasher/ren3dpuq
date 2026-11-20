// ===== Ren3D — data & interactions =====

const WHATSAPP_NUMBER = "56979981682";
const PRODUCTS_API = "/api/products";
const CATEGORIES_API = "/api/categories";
const INITIAL_VISIBLE = 8;

// Hasta que exista un campo "destacado" en la base (propuesto al dueño del
// sitio como checkbox en el panel de productos), los destacados son estos 4
// ids fijos. Para cambiarlos, edita esta lista.
const FEATURED_IDS = [
  "soporte-snes",
  "porta-llaves-honda",
  "lampara-mario",
  "soporte-control-audifonos",
];

// Vitrina curada de 4 categorías en la portada del catálogo (el filtro de
// abajo sigue mostrando todas las categorías que existan en la base).
const CATEGORY_CARDS = [
  { id: "gaming", label: "Gaming", img: "soporte-control-hadouken" },
  { id: "autos-jdm", label: "Autos / JDM", img: "porta-llaves-honda" },
  { id: "decoracion", label: "Decoración", img: "castillo-hogwarts" },
  { id: "personalizados", label: "Regalos", img: "llaveros-corazon" },
];

// 6 fotos de producto para la grilla de Instagram (en vez de la tarjeta de
// perfil con cifras que quedaban desactualizadas).
const INSTAGRAM_PHOTOS = [
  { img: "soporte-control-hadouken", alt: "Soporte de control Hadouken impreso en 3D" },
  { img: "porta-llaves-honda", alt: "Porta llaves Honda VTEC impreso en 3D" },
  { img: "lampara-mario", alt: "Lámpara estrella Mario Bros impresa en 3D" },
  { img: "castillo-hogwarts", alt: "Castillo de Hogwarts impreso en 3D" },
  { img: "repisa-pokebola", alt: "Repisa temática Pokébola impresa en 3D" },
  { img: "busto-eddie", alt: "Busto Eddie Aces High impreso en 3D" },
];

// No hay campo de color en la base: si un producto tiene una etiqueta (tag)
// que coincide con uno de estos nombres, se muestra como puntito de color.
const COLOR_SWATCHES = {
  rojo: "#e3141b", negro: "#1a1a1a", blanco: "#f5f5f5", azul: "#2f6fed",
  verde: "#2fa84f", amarillo: "#f4c430", morado: "#8b5cf6", rosado: "#ec4899",
  gris: "#9a9a9a", dorado: "#d4af37", plateado: "#c0c0c0", naranjo: "#f97316",
  "café": "#7b4b2a", celeste: "#38bdf8", turquesa: "#2dd4bf", fucsia: "#d6249f",
  violeta: "#7c3aed",
};

let PRODUCTS = [];
let CATEGORIES = [];
let currentFilter = "todos";
let expanded = false;

function buildWhatsAppLink(product) {
  const msg = `Hola! Me interesa el/la ${product.title} que vi en ren3dpuq.cl`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// La categoría "personalizados" se muestra siempre como "A pedido" (filtro,
// tarjeta de producto y modal usan todos esta misma etiqueta).
function categoryLabel(id) {
  if (id === "personalizados") return "A pedido";
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? cat.label : capitalize(id || "");
}

function colorDotsFor(product) {
  return (product.tags || [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => COLOR_SWATCHES[t]);
}

// Las fotos que viven en images/*.jpg tienen version WebP generada en
// images/webp/; las imagenes subidas desde el panel (/uploads/...) se usan
// tal cual, no tienen version WebP local.
function productImage(product, size) {
  const match = /^images\/([^/]+)\.(jpg|jpeg|png)$/i.exec(product.img || "");
  if (!match) return { webp: null, fallback: product.img };
  const base = match[1];
  const webp = size === "card"
    ? `images/webp/${base}-600.webp`
    : `images/webp/${base}.webp`;
  return { webp, fallback: product.img };
}

function pictureHtml(product, size, extraAttrs) {
  const { webp, fallback } = productImage(product, size);
  const img = `<img src="${fallback}" alt="${product.title}" class="product-img" ${extraAttrs || ""}>`;
  if (!webp) return img;
  return `<picture><source srcset="${webp}" type="image/webp">${img}</picture>`;
}

function productCardHtml(product) {
  const hasPrice = product.price !== null && product.price !== undefined;
  const dots = colorDotsFor(product);
  return `
    <article class="product-card" data-category="${product.category}" data-id="${product.id}">
      <div class="product-media">
        ${pictureHtml(product, "card", 'loading="lazy"')}
        <div class="media-fallback">${product.icon || ""}</div>
      </div>
      <div class="product-body">
        <span class="product-category">${categoryLabel(product.category)}</span>
        <h3 class="product-title">${product.title}</h3>
        ${dots.length ? `<div class="color-dots">${dots.map((c) => `<span class="color-dot" style="background:${COLOR_SWATCHES[c]}" title="${capitalize(c)}"></span>`).join("")}</div>` : ""}
        <p class="product-desc">${product.desc}</p>
        <div class="product-footer">
          ${hasPrice
            ? `<div class="product-price">${product.priceFrom ? '<span class="from">Desde</span>' : ""}${product.priceLabel}</div>
               <a class="product-cta" href="${buildWhatsAppLink(product)}" target="_blank" rel="noopener" aria-label="Pedir ${product.title} por WhatsApp">
                 <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5l-1.4 5.12 5.25-1.37a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.95 1.4-.5.08-1.12.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.16-4.94-4.35-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.28.58-.35.78-.35.2 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.14-.3.3-.13.58.17.28.75 1.24 1.62 2 1.11.99 2.05 1.3 2.33 1.44.28.14.44.12.6-.07.17-.2.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.35z"/></svg>
                 Pedir
               </a>`
            : `<div class="product-price product-price-quote">A cotizar</div>
               <a class="product-cta-quote" href="${buildWhatsAppLink(product)}" target="_blank" rel="noopener" aria-label="Cotizar ${product.title} por WhatsApp">Cotizar</a>`
          }
        </div>
      </div>
    </article>
  `;
}

function attachImageFallbacks(root) {
  root.querySelectorAll(".product-img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const media = img.closest(".product-media");
      if (media) media.classList.add("no-image");
    });
  });
}

function renderFeatured() {
  const wrap = document.getElementById("featuredGrid");
  if (!wrap) return;
  const items = FEATURED_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  wrap.innerHTML = items.map(productCardHtml).join("");
  attachImageFallbacks(wrap);
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const moreWrap = document.getElementById("catalogMore");
  const moreBtn = document.getElementById("showMoreBtn");

  if (!PRODUCTS.length) {
    grid.innerHTML = `<p class="catalog-empty">Cargando catálogo...</p>`;
    moreWrap.hidden = true;
    return;
  }

  const items = currentFilter === "todos" ? PRODUCTS : PRODUCTS.filter((p) => p.category === currentFilter);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

  grid.innerHTML = visible.length
    ? visible.map(productCardHtml).join("")
    : `<p class="catalog-empty">No hay productos en esta categoría todavía.</p>`;
  attachImageFallbacks(grid);

  if (!expanded && items.length > INITIAL_VISIBLE) {
    moreWrap.hidden = false;
    moreBtn.textContent = `Ver los ${items.length} productos`;
  } else {
    moreWrap.hidden = true;
  }
}

function setFilter(filterId) {
  currentFilter = filterId;
  expanded = false;
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b.dataset.filter === filterId));
  document.querySelectorAll(".category-card").forEach((c) => c.classList.toggle("active", c.dataset.filter === filterId));
  renderProducts();
}

async function loadProducts() {
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error("bad response");
    PRODUCTS = await res.json();
  } catch (err) {
    document.getElementById("productGrid").innerHTML = `<p class="catalog-empty">No se pudo cargar el catálogo. Intenta recargar la página.</p>`;
    return;
  }
  renderFeatured();
  renderProducts();
}

function renderCategoryCards() {
  const wrap = document.getElementById("categoryCards");
  wrap.innerHTML = CATEGORY_CARDS.map((c) => `
    <button type="button" class="category-card" data-filter="${c.id}">
      <picture>
        <source srcset="images/webp/${c.img}-600.webp" type="image/webp">
        <img src="images/${c.img}.jpg" alt="${c.label}" loading="lazy">
      </picture>
      <span class="category-card-label">${c.label}</span>
    </button>
  `).join("");
  wrap.querySelectorAll(".category-card").forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });
}

async function loadCategories() {
  const filters = document.getElementById("filters");
  try {
    const res = await fetch(CATEGORIES_API);
    if (!res.ok) throw new Error("bad response");
    CATEGORIES = await res.json();
  } catch (err) {
    CATEGORIES = [];
  }
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.filter = cat.id;
    btn.textContent = categoryLabel(cat.id);
    filters.appendChild(btn);
  });
  initFilters();
}

function initFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });
}

function initShowMore() {
  const btn = document.getElementById("showMoreBtn");
  btn.addEventListener("click", () => {
    expanded = true;
    renderProducts();
  });
}

function renderInstagramGrid() {
  const wrap = document.getElementById("instagramGrid");
  if (!wrap) return;
  wrap.innerHTML = INSTAGRAM_PHOTOS.map((p) => `
    <picture>
      <source srcset="images/webp/${p.img}-600.webp" type="image/webp">
      <img src="images/${p.img}.jpg" alt="${p.alt}" loading="lazy">
    </picture>
  `).join("");
}

function initLogoFallbacks() {
  document.querySelectorAll(".logo-img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const logo = img.closest(".logo");
      if (logo) logo.classList.add("logo-fallback");
    });
  });
}

function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });
}

// Enlaces del footer que deben filtrar el catálogo en vez de solo bajar a #catalogo.
function initFooterFilterLinks() {
  document.querySelectorAll("a[data-filter]").forEach((a) => {
    a.addEventListener("click", () => setFilter(a.dataset.filter));
  });
}

function openProductModal(product) {
  const modal = document.getElementById("productModal");
  const { webp, fallback } = productImage(product, "full");
  const img = document.getElementById("modalImg");
  img.src = webp || fallback;
  img.alt = product.title;

  document.getElementById("modalCategory").textContent = categoryLabel(product.category);
  document.getElementById("modalTitle").textContent = product.title;
  document.getElementById("modalDesc").textContent = product.desc;
  document.getElementById("modalTags").innerHTML = (product.tags || [])
    .map((t) => `<span class="product-tag">${t}</span>`).join("");

  const priceEl = document.getElementById("modalPrice");
  const hasPrice = product.price !== null && product.price !== undefined;
  if (hasPrice) {
    priceEl.classList.remove("product-price-quote");
    priceEl.innerHTML = `${product.priceFrom ? '<span class="from">Desde</span>' : ""}${product.priceLabel}`;
  } else {
    priceEl.classList.add("product-price-quote");
    priceEl.textContent = "A cotizar";
  }

  const cta = document.getElementById("modalCta");
  cta.href = buildWhatsAppLink(product);
  document.getElementById("modalCtaLabel").textContent = hasPrice ? "Pedir por WhatsApp" : "Cotizar por WhatsApp";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("open");
  document.body.style.overflow = "";
}

function initProductModal() {
  const modal = document.getElementById("productModal");
  modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeProductModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeProductModal();
  });

  ["productGrid", "featuredGrid"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      if (e.target.closest("a,button")) return;
      const card = e.target.closest(".product-card");
      if (!card) return;
      const product = PRODUCTS.find((p) => p.id === card.dataset.id);
      if (product) openProductModal(product);
    });
  });
}

function initSakuraPetals() {
  const canvas = document.getElementById("sakuraPetals");
  const hero = document.getElementById("inicio");
  if (!canvas || !hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");

  let petals = [], w = 0, h = 0;
  const colors = ["#e3141b", "#ff5f7a", "#ff8fa3"];

  function resize() {
    const rect = hero.getBoundingClientRect();
    w = canvas.width = rect.width * devicePixelRatio;
    h = canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }
  function makePetal() {
    return {
      x: Math.random() * w, y: -20 - Math.random() * h,
      size: (5 + Math.random() * 6) * devicePixelRatio,
      speed: (0.25 + Math.random() * 0.35) * devicePixelRatio,
      drift: (Math.random() - 0.5) * 0.4 * devicePixelRatio,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.018,
      sway: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }
  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = "rgba(227,20,27,0.45)";
    ctx.shadowBlur = 6 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.quadraticCurveTo(p.size / 2, -p.size / 2, 0, p.size / 2);
    ctx.quadraticCurveTo(-p.size / 2, -p.size / 2, 0, -p.size / 2);
    ctx.fill();
    ctx.restore();
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of petals) {
      p.y += p.speed;
      p.sway += 0.02;
      p.x += p.drift + Math.sin(p.sway) * 0.3 * devicePixelRatio;
      p.rot += p.rotSpeed;
      if (p.y > h + 20) Object.assign(p, makePetal(), { y: -20 });
      drawPetal(p);
    }
    requestAnimationFrame(tick);
  }
  resize();
  petals = Array.from({ length: 12 }, makePetal);
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", async () => {
  renderCategoryCards();
  renderInstagramGrid();
  initShowMore();
  initMobileMenu();
  initLogoFallbacks();
  initSakuraPetals();
  initProductModal();
  initFooterFilterLinks();

  await loadCategories();
  loadProducts();
});

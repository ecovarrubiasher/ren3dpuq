// ===== Ren3D — data & interactions =====

const WHATSAPP_NUMBER = "56979981682";
const PRODUCTS_API = "/api/products";
const CATEGORIES_API = "/api/categories";

let PRODUCTS = [];
let CATEGORIES = [];

function buildWhatsAppLink(product){
  const msg = `Hola Ren3D! Me interesa: ${product.title} (${product.priceLabel}). ¿Está disponible?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function renderProducts(filter = "todos"){
  const grid = document.getElementById("productGrid");
  const items = filter === "todos" ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  if (!PRODUCTS.length) {
    grid.innerHTML = `<p class="catalog-empty">Cargando catálogo...</p>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <article class="product-card" data-category="${p.category}">
      <div class="product-media">
        <img src="${p.img}" alt="${p.title}" loading="lazy" class="product-img">
        <div class="media-fallback">${p.icon}</div>
        <span class="product-badge${p.category === 'personalizados' ? ' sold' : ''}">${p.category === 'personalizados' ? 'A pedido' : categoryLabel(p.category)}</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${p.title}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-tags">
          ${(p.tags || []).map(t => `<span class="product-tag">${t}</span>`).join("")}
        </div>
        <div class="product-footer">
          <div class="product-price">
            ${p.priceFrom ? '<span class="from">Desde</span>' : ''}${p.priceLabel}
          </div>
          <a class="product-cta" href="${buildWhatsAppLink(p)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5l-1.4 5.12 5.25-1.37a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.95 1.4-.5.08-1.12.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.16-4.94-4.35-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.28.58-.35.78-.35.2 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.14-.3.3-.13.58.17.28.75 1.24 1.62 2 1.11.99 2.05 1.3 2.33 1.44.28.14.44.12.6-.07.17-.2.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.35z"/></svg>
            Pedir
          </a>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".product-img").forEach(img => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      img.closest(".product-media").classList.add("no-image");
    });
  });
}

async function loadProducts(){
  const grid = document.getElementById("productGrid");
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error("bad response");
    PRODUCTS = await res.json();
  } catch (err) {
    grid.innerHTML = `<p class="catalog-empty">No se pudo cargar el catálogo. Intenta recargar la página.</p>`;
    return;
  }
  const activeFilter = document.querySelector(".filter-btn.active");
  renderProducts(activeFilter ? activeFilter.dataset.filter : "todos");
}

function initLogoFallbacks(){
  document.querySelectorAll(".logo-img, .instagram-avatar img").forEach(img => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const logo = img.closest(".logo");
      if (logo) logo.classList.add("logo-fallback");
    });
  });
}

function capitalize(str){
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function categoryLabel(id){
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.label : capitalize(id || "");
}

async function loadCategories(){
  const filters = document.getElementById("filters");
  try {
    const res = await fetch(CATEGORIES_API);
    if (!res.ok) throw new Error("bad response");
    CATEGORIES = await res.json();
  } catch (err) {
    CATEGORIES = [];
  }
  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.filter = cat.id;
    btn.textContent = cat.label;
    filters.appendChild(btn);
  });
  initFilters();
}

function initFilters(){
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(btn.dataset.filter);
    });
  });
}

function initMobileMenu(){
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function initSakuraPetals(){
  const canvas = document.getElementById("sakuraPetals");
  const hero = document.getElementById("inicio");
  if (!canvas || !hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");

  let petals = [], w = 0, h = 0;
  const colors = ["#e8121f", "#ff5f7a", "#ff8fa3"];

  function resize(){
    const rect = hero.getBoundingClientRect();
    w = canvas.width = rect.width * devicePixelRatio;
    h = canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
  }
  function makePetal(){
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
  function drawPetal(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = "rgba(232,18,31,0.5)";
    ctx.shadowBlur = 6 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.quadraticCurveTo(p.size / 2, -p.size / 2, 0, p.size / 2);
    ctx.quadraticCurveTo(-p.size / 2, -p.size / 2, 0, -p.size / 2);
    ctx.fill();
    ctx.restore();
  }
  function tick(){
    ctx.clearRect(0, 0, w, h);
    for (const p of petals){
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
  petals = Array.from({ length: 14 }, makePetal);
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  loadProducts();
  initMobileMenu();
  initLogoFallbacks();
  initSakuraPetals();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
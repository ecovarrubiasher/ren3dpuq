// ===== Ren3D — admin panel logic =====

const ADMIN_API = "/gestion-x7q2k9/api/products";
const UPLOAD_API = "/gestion-x7q2k9/api/upload";
const CATEGORIES_API = "/gestion-x7q2k9/api/categories";

let products = [];
let categories = [];
let editingId = null;
let selectedFile = null;

const els = {};

function q(id) { return document.getElementById(id); }

function showMsg(text, isError) {
  els.formMsg.hidden = false;
  els.formMsg.textContent = text;
  els.formMsg.classList.toggle("admin-msg-error", !!isError);
  els.formMsg.classList.toggle("admin-msg-ok", !isError);
}

async function loadProducts() {
  const res = await fetch(ADMIN_API);
  if (res.status === 401) {
    window.location.reload();
    return;
  }
  if (!res.ok) {
    els.productList.innerHTML = `<p class="admin-msg admin-msg-error">No se pudo cargar el listado (${res.status}).</p>`;
    return;
  }
  products = await res.json();
  renderList();
}

function categoryLabel(id) {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.label : id;
}

function renderList() {
  els.productCount.textContent = products.length;
  els.productList.innerHTML = products.map(p => `
    <article class="admin-item">
      <div class="admin-item-media">
        ${p.img ? `<img src="${p.img}" alt="${p.title}">` : `<div class="admin-item-icon">${p.icon || "🎁"}</div>`}
      </div>
      <div class="admin-item-body">
        <strong>${p.title}</strong>
        <span>${categoryLabel(p.category)} · ${p.priceLabel}</span>
      </div>
      <div class="admin-item-actions">
        <button type="button" class="btn btn-outline admin-edit-btn" data-id="${p.id}">Editar</button>
        <button type="button" class="btn admin-delete-btn" data-id="${p.id}">Eliminar</button>
      </div>
    </article>
  `).join("") || `<p>No hay productos todavía.</p>`;

  els.productList.querySelectorAll(".admin-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
  els.productList.querySelectorAll(".admin-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
  });
}

function startEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  q("productId").value = p.id;
  q("fTitle").value = p.title;
  q("fDesc").value = p.desc || "";
  q("fCategory").value = p.category;
  q("fIcon").value = p.icon || "";
  q("fTags").value = (p.tags || []).join(", ");
  q("fPrice").value = p.price ?? "";
  q("fPriceLabel").value = p.priceLabel || "";
  q("fPriceFrom").checked = !!p.priceFrom;
  selectedFile = null;
  q("fImage").value = "";
  if (p.img) {
    els.imgPreview.src = p.img;
    els.imgPreviewWrap.hidden = false;
  } else {
    els.imgPreviewWrap.hidden = true;
  }
  els.formTitle.textContent = "Editar producto";
  els.submitBtn.textContent = "Guardar cambios";
  els.cancelEditBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  selectedFile = null;
  q("productForm").reset();
  q("productId").value = "";
  els.imgPreviewWrap.hidden = true;
  els.formTitle.textContent = "Agregar producto";
  els.submitBtn.textContent = "Agregar producto";
  els.cancelEditBtn.hidden = true;
  els.formMsg.hidden = true;
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
  const res = await fetch(`${ADMIN_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.ok) {
    await loadProducts();
    if (editingId === id) resetForm();
  } else {
    alert("No se pudo eliminar el producto.");
  }
}

function populateCategorySelect() {
  q("fCategory").innerHTML = categories.map(c => `<option value="${c.id}">${c.label}</option>`).join("");
}

function showCategoryMsg(text, isError) {
  els.categoryMsg.hidden = false;
  els.categoryMsg.textContent = text;
  els.categoryMsg.classList.toggle("admin-msg-error", !!isError);
  els.categoryMsg.classList.toggle("admin-msg-ok", !isError);
}

async function loadCategories() {
  const res = await fetch(CATEGORIES_API);
  if (res.status === 401) {
    window.location.reload();
    return;
  }
  categories = res.ok ? await res.json() : [];
  populateCategorySelect();
  renderCategoryList();
}

function renderCategoryList() {
  els.categoryList.innerHTML = categories.map(c => `
    <div class="admin-category-item" data-id="${c.id}">
      <input type="text" class="cat-label-input" value="${c.label}">
      <button type="button" class="btn btn-outline cat-save-btn">Guardar</button>
      <button type="button" class="btn admin-delete-btn cat-delete-btn">Eliminar</button>
    </div>
  `).join("") || `<p>No hay categorías todavía.</p>`;

  els.categoryList.querySelectorAll(".admin-category-item").forEach(row => {
    const id = row.dataset.id;
    row.querySelector(".cat-save-btn").addEventListener("click", () => {
      saveCategory(id, row.querySelector(".cat-label-input").value);
    });
    row.querySelector(".cat-delete-btn").addEventListener("click", () => deleteCategory(id));
  });
}

async function saveCategory(id, label) {
  label = label.trim();
  if (!label) return;
  const res = await fetch(`${CATEGORIES_API}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (res.ok) {
    showCategoryMsg("Categoría actualizada.", false);
    await loadCategories();
    await loadProducts();
  } else {
    const data = await res.json().catch(() => ({}));
    showCategoryMsg(data.error || "No se pudo actualizar la categoría.", true);
  }
}

async function deleteCategory(id) {
  if (!confirm("¿Eliminar esta categoría?")) return;
  const res = await fetch(`${CATEGORIES_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.ok) {
    showCategoryMsg("Categoría eliminada.", false);
    await loadCategories();
  } else {
    const data = await res.json().catch(() => ({}));
    showCategoryMsg(data.error || "No se pudo eliminar la categoría.", true);
  }
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const input = q("fCategoryLabel");
  const label = input.value.trim();
  if (!label) return;
  const res = await fetch(CATEGORIES_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (res.ok) {
    input.value = "";
    showCategoryMsg("Categoría agregada.", false);
    await loadCategories();
  } else {
    const data = await res.json().catch(() => ({}));
    showCategoryMsg(data.error || "No se pudo agregar la categoría.", true);
  }
}

async function uploadImageIfNeeded() {
  if (!selectedFile) return null;
  const form = new FormData();
  form.append("file", selectedFile);
  const res = await fetch(UPLOAD_API, { method: "POST", body: form });
  if (!res.ok) throw new Error("Error al subir la imagen");
  const data = await res.json();
  return data.url;
}

async function handleSubmit(e) {
  e.preventDefault();
  els.submitBtn.disabled = true;
  try {
    let imgUrl = null;
    if (selectedFile) {
      imgUrl = await uploadImageIfNeeded();
    } else if (editingId) {
      const existing = products.find(p => p.id === editingId);
      imgUrl = existing ? existing.img : "";
    }

    const payload = {
      title: q("fTitle").value.trim(),
      desc: q("fDesc").value.trim(),
      category: q("fCategory").value,
      icon: q("fIcon").value.trim() || "🎁",
      tags: q("fTags").value.split(",").map(t => t.trim()).filter(Boolean),
      price: q("fPrice").value ? Number(q("fPrice").value) : null,
      priceLabel: q("fPriceLabel").value.trim() || "Consultar",
      priceFrom: q("fPriceFrom").checked,
      img: imgUrl || "",
    };

    let res;
    if (editingId) {
      res = await fetch(`${ADMIN_API}/${encodeURIComponent(editingId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) throw new Error("Error al guardar el producto");

    showMsg(editingId ? "Producto actualizado." : "Producto agregado.", false);
    resetForm();
    await loadProducts();
  } catch (err) {
    showMsg(err.message || "Ocurrió un error.", true);
  } finally {
    els.submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  els.formTitle = q("formTitle");
  els.submitBtn = q("submitBtn");
  els.cancelEditBtn = q("cancelEditBtn");
  els.formMsg = q("formMsg");
  els.productList = q("productList");
  els.productCount = q("productCount");
  els.imgPreview = q("imgPreview");
  els.imgPreviewWrap = q("imgPreviewWrap");
  els.categoryList = q("categoryList");
  els.categoryMsg = q("categoryMsg");

  q("productForm").addEventListener("submit", handleSubmit);
  els.cancelEditBtn.addEventListener("click", resetForm);
  q("categoryForm").addEventListener("submit", handleCategorySubmit);
  q("logoutBtn").addEventListener("click", async () => {
    await fetch("/gestion-x7q2k9/api/logout", { method: "POST" });
    window.location.reload();
  });
  q("fImage").addEventListener("change", (e) => {
    const file = e.target.files[0];
    selectedFile = file || null;
    if (file) {
      els.imgPreview.src = URL.createObjectURL(file);
      els.imgPreviewWrap.hidden = false;
    }
  });

  await loadCategories();
  loadProducts();
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.hidden = true;
    const password = document.getElementById("password").value;
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const res = await fetch("/gestion-x7q2k9/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      msg.textContent = data.error || "Contraseña incorrecta.";
      msg.hidden = false;
    } catch (err) {
      msg.textContent = "Error de conexión. Intenta de nuevo.";
      msg.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
});

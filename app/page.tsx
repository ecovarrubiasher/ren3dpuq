const instagramUrl = "https://www.instagram.com/ren3dpuq/";
const instagramDmUrl = "https://ig.me/m/ren3dpuq";

const products = [
  {
    name: "Lámpara estrella Mario",
    price: "$15.000",
    category: "Gamer",
    image: "/catalog/mario-lamp.jpg",
    description: "Luz cálida, cable incluido y un acabado perfecto para tu setup.",
  },
  {
    name: "Porta llaves Honda VTEC",
    price: "$15.000",
    category: "Motor",
    image: "/catalog/honda-keyholder.jpg",
    description: "Inspirado en la tapa DOHC VTEC. Disponible en varios colores.",
  },
  {
    name: "Soporte control + audífonos",
    price: "$12.000",
    category: "Gamer",
    image: "/catalog/gaming-stand.jpg",
    description: "Ordena tu escritorio con un soporte compacto y resistente.",
  },
  {
    name: "Organizador de brochas",
    price: "$7.000",
    category: "Organización",
    image: "/catalog/brush-organizer.jpg",
    description: "Tres compartimentos y un diseño con moño, hecho a tu color.",
  },
  {
    name: "Repisa Pokébola",
    price: "$7.000",
    category: "Gamer",
    image: "/catalog/pokeball-shelf.jpg",
    description: "Para figuras y coleccionables. Liviana y fácil de instalar.",
  },
  {
    name: "Caja para cartas FIFA",
    price: "$7.000",
    category: "Colección",
    image: "/catalog/fifa-box.jpg",
    description: "Diseño Neymar Jr con cierre seguro para sobres o cartas.",
  },
  {
    name: "Llavero porta celular",
    price: "$2.000",
    category: "Accesorios",
    image: "/catalog/phone-keychain.jpg",
    description: "Plegable y compacto: soporte para celular que va en tus llaves.",
  },
  {
    name: "Placas de grafomotricidad",
    price: "Desde $1.500",
    category: "Educación",
    image: "/catalog/graphomotor.jpg",
    description: "Resistentes, reutilizables y pensadas para aprender jugando.",
  },
  {
    name: "Soporte para cartuchos SNES",
    price: "A pedido",
    category: "Gamer",
    image: "/catalog/snes-holder.jpg",
    description: "Organiza y luce tus juegos retro con un diseño inspirado en SNES.",
  },
];

function whatsappLink(product?: string) {
  const message = product
    ? `Hola Ren3D, vi ${product} en su catálogo web y quisiera consultar disponibilidad.`
    : "Hola Ren3D, vi su catálogo web y quisiera cotizar una impresión 3D.";
  return `https://wa.me/5979981682?text=${encodeURIComponent(message)}`;
}

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Ren3D, inicio">
          <img src="/ren3d-logo.jpeg" alt="Ren3D" />
        </a>
        <div className="nav-links">
          <a href="#catalogo">Catálogo</a>
          <a href="#como-comprar">Cómo comprar</a>
          <a className="nav-cta" href={instagramDmUrl} target="_blank" rel="noreferrer">
            Hablemos
          </a>
        </div>
      </nav>

      <section className="hero shell" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Ren3D · 蓮工房 · Punta Arenas</p>
          <h1>Diseño con <em>actitud.</em><br/>Impreso en 3D.</h1>
          <p className="lead">
            Objetos útiles, regalos y decoración creados capa a capa, con terminaciones que destacan. Elige un diseño o tráenos tu idea.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#catalogo">Ver catálogo <span>↓</span></a>
            <a className="button secondary" href={instagramDmUrl} target="_blank" rel="noreferrer">Escribir por Instagram</a>
          </div>
          <div className="hero-notes" aria-label="Características">
            <span>01 — Diseños a pedido</span>
            <span>02 — Varios colores</span>
            <span>03 — Entregas en Punta Arenas</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Productos destacados de Ren3D">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <figure className="hero-card hero-card-main">
            <img src="/catalog/mario-lamp.jpg" alt="Lámpara estrella de Mario impresa en 3D" />
            <figcaption><span>Serie gamer / 01</span><strong>Lámpara estrella</strong></figcaption>
          </figure>
          <figure className="hero-card hero-card-small">
            <img src="/catalog/honda-keyholder.jpg" alt="Porta llaves Honda VTEC impreso en 3D" />
          </figure>
          <div className="made-badge"><strong>蓮</strong><span>Hecho<br/>en PUQ</span></div>
          <div className="hero-jp" aria-hidden="true">蓮 工 房</div>
        </div>
      </section>

      <section className="marquee" aria-label="Servicios">
        <div>REN3D / 蓮工房 <b>●</b> DISEÑO A PEDIDO <b>●</b> ACCESORIOS <b>●</b> MUNDO GAMER <b>●</b> REGALOS ÚNICOS</div>
      </section>

      <section className="catalog shell section" id="catalogo">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Catálogo / Collection 01</p><h2>Piezas hechas<br/>para destacar.</h2></div>
          <p>Los colores pueden variar y la mayoría de los diseños se pueden adaptar. Consulta disponibilidad antes de comprar.</p>
        </div>
        <div className="product-grid">
          {products.map((product, index) => (
            <article className={`product-card ${index === 0 ? "featured" : ""}`} key={product.name}>
              <div className="product-image">
                <img src={product.image} alt={product.name} loading={index > 2 ? "lazy" : undefined} />
                <span className="category">{product.category}</span>
              </div>
              <div className="product-info">
                <div className="product-title"><h3>{product.name}</h3><strong>{product.price}</strong></div>
                <p>{product.description}</p>
                <div className="product-actions">
                  <span>Pedir por</span>
                  <div className="order-links">
                    <a href={instagramDmUrl} target="_blank" rel="noreferrer">Instagram</a>
                    <a className="whatsapp-link" href={whatsappLink(product.name)} target="_blank" rel="noreferrer" aria-label={`Pedir ${product.name} por WhatsApp`}>WhatsApp</a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="catalog-note">
          <p><strong>¿No encontraste lo que buscas?</strong><br/>Envíanos una referencia o cuéntanos tu idea.</p>
          <div className="catalog-note-actions">
            <a className="button dark" href={instagramDmUrl} target="_blank" rel="noreferrer">Cotizar por Instagram <span>↗</span></a>
            <a className="button whatsapp" href={whatsappLink()} target="_blank" rel="noreferrer">Cotizar por WhatsApp <span>↗</span></a>
          </div>
        </div>
      </section>

      <section className="process section" id="como-comprar">
        <div className="shell">
          <div className="section-heading light">
            <div><p className="eyebrow"><span /> Proceso / 工房</p><h2>De la idea<br/>a tus manos.</h2></div>
          </div>
          <div className="steps">
            <article><span>01</span><h3>Elige o imagina</h3><p>Selecciona un producto del catálogo o envíanos tu referencia.</p></article>
            <article><span>02</span><h3>Cotizamos</h3><p>Definimos tamaño, color, detalles y plazo de fabricación.</p></article>
            <article><span>03</span><h3>Imprimimos</h3><p>Tu pieza se fabrica capa a capa y se revisa antes de entregar.</p></article>
            <article><span>04</span><h3>Recíbelo</h3><p>Coordinamos entrega en Punta Arenas o la alternativa disponible.</p></article>
          </div>
        </div>
      </section>

      <section className="contact shell section">
        <div className="contact-card">
          <div>
            <p className="eyebrow"><span /> Contacto / 連絡</p>
            <h2>Hagamos algo<br/><em>fuera de serie.</em></h2>
          </div>
          <div className="contact-actions">
            <a className="button primary" href={instagramDmUrl} target="_blank" rel="noreferrer">Mensaje por Instagram <span>↗</span></a>
            <a className="button whatsapp" href={whatsappLink()} target="_blank" rel="noreferrer">Mensaje directo por WhatsApp <span>↗</span></a>
            <small>Atención por mensaje · Ren3D Punta Arenas</small>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#inicio"><img src="/ren3d-logo.jpeg" alt="Ren3D" /></a>
        <p>Impresiones 3D con estilo · Punta Arenas, Chile</p>
        <a href={instagramUrl} target="_blank" rel="noreferrer">@ren3dpuq ↗</a>
      </footer>
      <a className="floating-whatsapp" href={whatsappLink()} target="_blank" rel="noreferrer" aria-label="Escribir a Ren3D por WhatsApp">WA</a>
    </main>
  );
}

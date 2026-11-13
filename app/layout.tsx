import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono, Reggae_One, Russo_One } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

// Títulos: Russo One · Textos: Chakra Petch · Etiquetas: JetBrains Mono · Kanji: Reggae One
const display = Russo_One({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const sans = Chakra_Petch({ variable: "--font-sans", weight: ["400", "500", "600", "700"], style: ["normal", "italic"], subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });
const kanji = Reggae_One({ variable: "--font-kanji", weight: "400", subsets: ["latin"], preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ogImage = `${protocol}://${host}/og-redesign.png`;
  return {
    title: "Ren3D | Impresiones 3D en Punta Arenas",
    description: "Catálogo de impresiones 3D, regalos, decoración y diseños personalizados en Punta Arenas.",
    icons: { icon: "/ren3d-logo.jpeg", shortcut: "/ren3d-logo.jpeg" },
    openGraph: {
      title: "Ren3D — Tu idea, impresa en otra dimensión",
      description: "Impresiones 3D con estilo en Punta Arenas.",
      type: "website",
      locale: "es_CL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Ren3D, impresiones 3D en Punta Arenas" }],
    },
    twitter: { card: "summary_large_image", images: [ogImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${display.variable} ${sans.variable} ${mono.variable} ${kanji.variable}`}>{children}</body></html>;
}

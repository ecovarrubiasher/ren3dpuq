import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}

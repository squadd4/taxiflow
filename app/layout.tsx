import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

/** Absolute URL for social previews: explicit setting, then the Vercel production domain. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Taxi Flow | Aplicação de gestão para táxis, feita à medida",
  description:
    "Registo de corridas, faturação diária, fecho de contas e relatórios para a contabilidade. Uma aplicação feita à medida de motoristas e empresas de táxi em Portugal.",
  openGraph: {
    title: "Taxi Flow",
    description: "Feito para a estrada e para quem a conhece.",
    locale: "pt_PT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

/**
 * Runs before first paint: decides between the cinematic hero and the static
 * layout so neither flashes. `?motion=off` forces the static layout, and a slow
 * script load falls back to it rather than leaving the hero half-built.
 */
const motionScript = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search).get("motion");
var off=q==="off"||matchMedia("(prefers-reduced-motion: reduce)").matches;
d.dataset.motion=off?"off":"on";
if(q==="off")d.dataset.motionForced="query";
setTimeout(function(){if(!d.dataset.heroReady&&d.dataset.motion==="on"){d.dataset.motion="off";d.dataset.motionForced="timeout";}},9000);
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>
        <a className="skip-link" href="#conteudo">
          Saltar para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}

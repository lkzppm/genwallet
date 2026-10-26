import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Footer } from "@/components/site/footer";
import { Nav } from "@/components/site/nav";
import LocaleProvider from "@/i18n/LocaleProvider";
import { THEME_SCRIPT } from "@/lib/use-theme";
import "./globals.css";

// IBM Plex: an engineering face with steady figures for prices and
// percentages, its mono drawn with the sans.
const plexSans = IBM_Plex_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "GenWallet",
  description:
    "A genetic algorithm builds a portfolio of 10 Ibovespa companies and trades it live over 10 B3 sessions, every order published before the open. EEL874, UFRJ.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `lang` follows the visitor's choice after hydration (LocaleProvider), and
    // the `dark` class is corrected before the first paint by the script below.
    <html lang="pt-BR" className={`dark ${plexSans.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <LocaleProvider>
          <Nav />
          {children}
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}

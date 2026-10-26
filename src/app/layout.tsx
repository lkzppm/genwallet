import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import { Footer } from "@/components/site/footer";
import { Nav } from "@/components/site/nav";
import LocaleProvider from "@/i18n/LocaleProvider";
import { THEME_SCRIPT } from "@/lib/use-theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
    <html lang="pt-BR" className={`dark ${inter.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
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

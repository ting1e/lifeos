import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const doto = localFont({
  src: [{ path: "./fonts/doto.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-doto",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [{ path: "./fonts/space-grotesk.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = localFont({
  src: [
    { path: "./fonts/space-mono-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/space-mono-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-space-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description =
    locale === "zh"
      ? "自托管的个人生活追踪系统——训练、营养、Whoop、AI。"
      : locale === "tr"
        ? "Kişisel yaşam takipçisi — antrenman, beslenme, Whoop, AI."
        : "Self-hosted personal life tracker — workouts, nutrition, Whoop, AI.";
  return {
    title: "lifeos",
    description,
    manifest: "/manifest.json",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${doto.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}

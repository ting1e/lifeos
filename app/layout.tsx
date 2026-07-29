import type { Metadata, Viewport } from "next";
import { Doto, Space_Grotesk, Space_Mono } from "next/font/google";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
  weight: ["400", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
    title: "Lifetracker",
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

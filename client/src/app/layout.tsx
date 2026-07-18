import type { Metadata } from "next";
import { Inter, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import { AuthProvider } from "@/features/auth";
import { ThemeProvider, themeInitScript } from "@/features/theme";
import { LanguageProvider } from "@/shared/i18n";
import "./globals.css";

// Body face — Cyrillic-capable so Ukrainian copy renders without a fallback
// font swap.
const sansFace = Inter({
  variable: "--font-sans-face",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face — a high-contrast grimoire serif, used with restraint for
// headings, logo, and titles. Deliberately not the cliché "fantasy" font.
const cormorant = Cormorant_Garamond({
  variable: "--font-display-face",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DunDrAI",
  description: "Real-time multiplayer D&D with AI dungeon masters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sansFace.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

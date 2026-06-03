import type { Metadata } from "next";
import { Geist, Geist_Mono, Fira_Code } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HabitFlow | Micro-hábitos, Resultados Reais",
  description: "Plataforma de produtividade baseada na ciência dos mini-hábitos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground selection:bg-indigo/10 selection:text-indigo">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

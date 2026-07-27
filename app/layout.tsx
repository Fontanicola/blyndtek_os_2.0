import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Blyndtek OS",
  description: "Sistema de gestión interno de Blyndtek.",
  icons: {
    icon: [
      { url: "/Favicon_Blyndtek.svg", media: "(prefers-color-scheme: light)" },
      { url: "/Favicon_Blyndtek_dark.svg", media: "(prefers-color-scheme: dark)" }
    ],
    apple: "/Favicon_Blyndtek.svg"
  }
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <head>
        <link
          rel="icon"
          href="/Favicon_Blyndtek.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/Favicon_Blyndtek_dark.svg"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className={`${inter.className} bg-paper font-sans text-carbon antialiased`}>
        {children}
      </body>
    </html>
  );
}

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
    icon: "/Favicon_Blyndtek.svg",
    shortcut: "/Favicon_Blyndtek.svg",
    apple: "/Favicon_Blyndtek.svg"
  }
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-paper font-sans text-carbon antialiased`}>
        {children}
      </body>
    </html>
  );
}

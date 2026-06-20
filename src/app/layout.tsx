import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taiwan Explorer Map",
  description: "Taiwan Interactive Geographic Hub & Place Explorer built with Next.js and Leaflet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${inter.variable} ${outfit.variable} h-full overflow-hidden bg-[#080c14] text-slate-100 font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

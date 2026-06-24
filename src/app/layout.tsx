import type { Metadata, Viewport } from "next";
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
  title: "台灣地圖探索家",
  description: "以 Next.js 與 Leaflet 打造的台灣互動式地理資訊與景點探索平台。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 讓內容延伸至瀏海/底部手勢區，並啟用 env(safe-area-inset-*)
  themeColor: "#080c14",
  // 不設定 maximumScale／user-scalable，保留使用者縮放（無障礙）
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased dark">
      <body className={`${inter.variable} ${outfit.variable} h-full overflow-hidden bg-[#080c14] text-slate-100 font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

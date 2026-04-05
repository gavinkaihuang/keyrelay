import type { Metadata } from "next";
import { TopNav } from "../components/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "KeyRelay Admin",
  description: "API Key management dashboard for KeyRelay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
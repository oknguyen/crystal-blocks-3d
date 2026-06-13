import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Sora } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Castle Runner",
  description:
    "Game platformer kiểu Mario chạy trên Next.js và GitHub Pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${spaceGrotesk.variable} ${sora.variable}`}>
        {children}
      </body>
    </html>
  );
}

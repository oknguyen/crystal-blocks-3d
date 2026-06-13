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
  title: "Crystal Blocks 3D",
  description:
    "Trò chơi block puzzle 3D phong cách low-poly, màu sắc rực rỡ, chạy trên Next.js.",
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

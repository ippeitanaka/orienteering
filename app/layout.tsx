import type React from "react"
import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import { Roboto_Mono } from "next/font/google"
import { Oswald } from "next/font/google"
import "./globals.css"

// 日本語フォント
const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "700"],
})

// 英語見出しフォント
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "700"],
})

// モノスペースフォント
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
})

export const metadata: Metadata = {
  title: "ELT学外オリエンテーション",
  description: "東洋医療専門学校　救急救命士学科のオリエンテーリングアプリ",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="dark">
      <body className={`${noto.variable} ${oswald.variable} ${robotoMono.variable} elt-bg`}>{children}</body>
    </html>
  )
}

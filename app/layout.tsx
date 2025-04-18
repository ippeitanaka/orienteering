import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Noto_Sans_JP } from "next/font/google"
import { Baloo_2, Bubblegum_Sans } from "next/font/google"
import "./globals.css"

// 既存のフォント
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const noto = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto" })

// かわいいフォントを追加
const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
})

const bubblegum = Bubblegum_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bubblegum",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ELT学外オリエンテーション",
  description: "東洋大学英語コミュニケーション学科のオリエンテーリングアプリ",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${noto.variable} ${baloo.variable} ${bubblegum.variable}`}>{children}</body>
    </html>
  )
}

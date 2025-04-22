import type React from "react"
import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import { Noto_Sans_JP } from "next/font/google"
import { Baloo_2, Bubblegum_Sans, Comic_Neue, Fredoka } from "next/font/google"
import "./globals.css"

// かわいいメインフォント
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
})

// 日本語フォント
const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "700"],
})

// かわいい見出しフォント
const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
})

// 特別なかわいいフォント
const bubblegum = Bubblegum_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bubblegum",
  display: "swap",
})

// コミカルなフォント
const comic = Comic_Neue({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-comic",
  display: "swap",
})

// 丸っこいフォント
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
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
    <html lang="ja">
      <body
        className={`${nunito.variable} ${noto.variable} ${baloo.variable} ${bubblegum.variable} ${comic.variable} ${fredoka.variable} font-cute`}
      >
        {children}
      </body>
    </html>
  )
}

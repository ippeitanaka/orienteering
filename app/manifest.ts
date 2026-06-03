import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ELT学外オリエンテーション",
    short_name: "ELT学外オリ",
    description: "東洋医療専門学校 救急救命士学科のオリエンテーリングアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      {
        src: "/app-icon.png",
        sizes: "1254x1254",
        type: "image/png",
      },
    ],
  }
}
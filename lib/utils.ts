import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function getContrastColor(hexColor: string): string {
  // 色が指定されていない場合はデフォルトの黒を返す
  if (!hexColor) return "#000000"

  // #を除去
  const hex = hexColor.replace("#", "")

  // RGBに変換
  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)

  // 輝度を計算
  const brightness = (r * 299 + g * 587 + b * 114) / 1000

  // 輝度が128以上なら黒、そうでなければ白を返す
  return brightness >= 128 ? "#000000" : "#FFFFFF"
}

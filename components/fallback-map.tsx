"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function FallbackMap() {
  const [isMounted, setIsMounted] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    setIsMounted(true)

    // 現在地を取得
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="space-y-4">
      <Alert variant="default" className="rounded-xl border-2 border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>マップの読み込みに問題が発生しました</AlertTitle>
        <AlertDescription>フォールバックモードを表示しています。</AlertDescription>
      </Alert>

      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="font-bold mb-2">現在地情報</h3>
        {currentPosition ? (
          <div>
            <p>緯度: {currentPosition.lat.toFixed(6)}</p>
            <p>経度: {currentPosition.lng.toFixed(6)}</p>
          </div>
        ) : (
          <p>位置情報を取得できませんでした。</p>
        )}
      </div>
    </div>
  )
}

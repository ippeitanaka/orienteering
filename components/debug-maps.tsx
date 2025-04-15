"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DebugMaps() {
  const [isMapWorking, setIsMapWorking] = useState<boolean>(false)

  useEffect(() => {
    // Leafletが利用可能かチェック
    setIsMapWorking(typeof window !== "undefined" && !!window.L)
  }, [])

  return (
    <Card className="cute-card border-primary/30 overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
      <CardHeader>
        <CardTitle className="font-heading text-primary">OpenStreetMap設定</CardTitle>
        <CardDescription>マップライブラリの設定状況</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMapWorking ? "bg-green-500" : "bg-red-500"}`}></div>
            <p>Leaflet: {isMapWorking ? "利用可能" : "利用不可"}</p>
          </div>

          {!isMapWorking && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>マップライブラリが読み込まれていません</AlertTitle>
              <AlertDescription>
                <p>ページを再読み込みするか、ブラウザのキャッシュをクリアしてみてください。</p>
              </AlertDescription>
            </Alert>
          )}

          {isMapWorking && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>マップライブラリが正常に読み込まれています</AlertTitle>
              <AlertDescription>
                <p>OpenStreetMapを使用してマップを表示できます。</p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

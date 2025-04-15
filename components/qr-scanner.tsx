"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { QrCode, Scan, Camera, AlertCircle } from "lucide-react"

// Html5Qrcodeをdynamic importでクライアントサイドのみで読み込む
const Html5QrcodeWrapper = dynamic(() => import("./html5-qrcode-wrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-sm mx-auto h-64 flex items-center justify-center bg-muted/50 rounded-xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
        <p className="mt-3 text-sm font-medium">QRスキャナーを読み込み中...</p>
      </div>
    </div>
  ),
})

export default function QRScanner() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleScanSuccess = (decodedText: string) => {
    setScanning(false)

    try {
      // QRコードのURLをパース
      const url = new URL(decodedText)
      const path = url.pathname
      const checkpointId = path.split("/").pop() || url.searchParams.get("checkpoint")

      if (checkpointId) {
        // チェックポイントページに遷移
        router.push(`/checkpoint/${checkpointId}`)
      } else {
        setError("無効なQRコードです。チェックポイントIDが含まれていません。")
      }
    } catch (err) {
      setError("無効なQRコードです。正しいURLではありません。")
    }
  }

  const handleScanError = (error: any) => {
    console.error("QRコードのスキャンエラー:", error)
  }

  const handleScanFailure = (errorMessage: string) => {
    setError(errorMessage)
    setScanning(false)
  }

  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return (
      <Card className="glass-panel border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QRコードスキャナー
          </CardTitle>
          <CardDescription>チェックポイントのQRコードをスキャンしてミッションを表示します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-sm mx-auto h-64 flex items-center justify-center bg-muted/50 rounded-xl">
            <p className="text-muted-foreground">QRスキャナーを準備中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-panel border-primary/20 shadow-lg slide-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          QRコードスキャナー
        </CardTitle>
        <CardDescription>チェックポイントのQRコードをスキャンしてミッションを表示します</CardDescription>
      </CardHeader>
      <CardContent>
        {scanning ? (
          <div className="relative">
            {isMounted && (
              <Html5QrcodeWrapper
                scanning={scanning}
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                onScanFailure={handleScanFailure}
              />
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-primary/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-12 h-2 bg-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 left-0 w-2 h-12 bg-primary rounded-tl-lg"></div>

                  <div className="absolute top-0 right-0 w-12 h-2 bg-primary rounded-tr-lg"></div>
                  <div className="absolute top-0 right-0 w-2 h-12 bg-primary rounded-tr-lg"></div>

                  <div className="absolute bottom-0 left-0 w-12 h-2 bg-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-12 bg-primary rounded-bl-lg"></div>

                  <div className="absolute bottom-0 right-0 w-12 h-2 bg-primary rounded-br-lg"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-12 bg-primary rounded-br-lg"></div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-1 bg-primary/50 animate-pulse-soft"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm mx-auto h-64 flex items-center justify-center bg-muted/20 rounded-xl">
            <div className="text-center">
              <div className="bg-primary/10 p-4 rounded-full mx-auto mb-4">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <p className="font-medium">QRコードをスキャンする準備ができました</p>
              <p className="text-sm text-muted-foreground mt-2">「スキャン開始」ボタンをクリックしてください</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-xl flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">スキャンエラー</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center pt-2 pb-4">
        {!scanning ? (
          <Button
            onClick={() => {
              setScanning(true)
              setError(null)
            }}
            className="cute-button flex items-center gap-2 px-6"
          >
            <Scan className="h-5 w-5" />
            スキャン開始
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setScanning(false)}
            className="rounded-full border-primary/30 hover:bg-primary/10"
          >
            スキャンを停止
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

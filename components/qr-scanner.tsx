"use client"

import type React from "react"

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
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [lastScannedText, setLastScannedText] = useState<string>("")
  const router = useRouter()

  // デバッグ情報を追加する関数
  const addDebugInfo = (message: string) => {
    setDebugInfo((prev) => `${prev}\n${new Date().toISOString().split("T")[1]}: ${message}`)
    console.log(message)
  }

  useEffect(() => {
    setIsMounted(true)
    addDebugInfo("QR Scanner component mounted")
  }, [])

  const handleScanSuccess = (decodedText: string) => {
    addDebugInfo(`QR code scanned: ${decodedText}`)
    setLastScannedText(decodedText)
    setScanning(false)

    try {
      // QRコードのURLをパース
      let checkpointId: string | null = null

      // URLの場合
      if (decodedText.startsWith("http")) {
        addDebugInfo("Detected URL format")

        try {
          const url = new URL(decodedText)
          addDebugInfo(`Parsed URL: ${url.toString()}`)
          addDebugInfo(`Path: ${url.pathname}`)

          // /checkpoint/{id} 形式のURLの場合
          const match = url.pathname.match(/\/checkpoint\/(\d+)/)
          if (match && match[1]) {
            checkpointId = match[1]
            addDebugInfo(`Extracted checkpoint ID from path: ${checkpointId}`)
          } else {
            // クエリパラメータからcheckpointを取得
            checkpointId = url.searchParams.get("checkpoint")
            addDebugInfo(`Extracted checkpoint ID from query: ${checkpointId}`)
          }
        } catch (urlError) {
          addDebugInfo(`URL parsing error: ${urlError}`)

          // URLのパース失敗時に直接パスを抽出する試み
          const pathMatch = decodedText.match(/\/checkpoint\/(\d+)/)
          if (pathMatch && pathMatch[1]) {
            checkpointId = pathMatch[1]
            addDebugInfo(`Extracted checkpoint ID from raw path: ${checkpointId}`)
          }
        }
      } else {
        // 数字のみの場合は直接チェックポイントIDとして扱う
        if (/^\d+$/.test(decodedText)) {
          checkpointId = decodedText
          addDebugInfo(`Using raw numeric value as checkpoint ID: ${checkpointId}`)
        }
      }

      if (checkpointId) {
        addDebugInfo(`Navigating to checkpoint: ${checkpointId}`)
        // チェックポイントページに遷移
        router.push(`/checkpoint/${checkpointId}`)
      } else {
        addDebugInfo("No checkpoint ID found in QR code")
        setError("無効なQRコードです。チェックポイントIDが含まれていません。")
      }
    } catch (err) {
      addDebugInfo(`Error parsing QR code: ${err}`)
      setError("無効なQRコードです。正しいURLではありません。")
    }
  }

  const handleScanError = (error: any) => {
    addDebugInfo(`QR scan error: ${error}`)
  }

  const handleScanFailure = (errorMessage: string) => {
    addDebugInfo(`QR scan failure: ${errorMessage}`)
    setError(errorMessage)
    setScanning(false)
  }

  // 手動でチェックポイントIDを入力する処理
  const handleManualEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem("checkpointId") as HTMLInputElement
    const id = input.value.trim()

    if (id && /^\d+$/.test(id)) {
      addDebugInfo(`Manually entered checkpoint ID: ${id}`)
      router.push(`/checkpoint/${id}`)
    } else {
      setError("有効なチェックポイントIDを入力してください（数字のみ）")
    }
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
    <Card className="border-primary/20 shadow-lg slide-in bg-white/90 backdrop-blur-sm rounded-xl">
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

        {/* 手動入力フォーム */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium mb-2">チェックポイントIDを手動入力</h3>
          <form onSubmit={handleManualEntry} className="flex gap-2">
            <input
              type="text"
              name="checkpointId"
              placeholder="チェックポイントID"
              className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
            />
            <Button type="submit" size="sm">
              移動
            </Button>
          </form>
        </div>

        {/* 最後にスキャンしたQRコードの内容 */}
        {lastScannedText && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium mb-1">最後にスキャンしたQRコード:</h3>
            <p className="text-xs break-all">{lastScannedText}</p>
          </div>
        )}

        {/* デバッグ情報 */}
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground">デバッグ情報</summary>
          <pre className="mt-2 p-2 bg-muted/30 rounded-md whitespace-pre-wrap overflow-auto max-h-40">{debugInfo}</pre>
        </details>
      </CardContent>
      <CardFooter className="flex justify-center pt-2 pb-4">
        {!scanning ? (
          <Button
            onClick={() => {
              setScanning(true)
              setError(null)
              addDebugInfo("Scan started")
            }}
            className="cute-button flex items-center gap-2 px-6"
          >
            <Scan className="h-5 w-5" />
            スキャン開始
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setScanning(false)
              addDebugInfo("Scan stopped")
            }}
            className="rounded-full border-primary/30 hover:bg-primary/10"
          >
            スキャンを停止
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

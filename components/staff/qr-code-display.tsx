"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { generateQRCodeUrl, type Checkpoint } from "@/lib/supabase"
import QRCode from "qrcode"

interface QRCodeDisplayProps {
  checkpoint: Checkpoint
  onClose?: () => void
}

export default function QRCodeDisplay({ checkpoint, onClose }: QRCodeDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  useEffect(() => {
    const url = generateQRCodeUrl(checkpoint.id.toString())
    setQrCodeUrl(url)

    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
    })
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl)
      })
      .catch((err) => {
        console.error("Error generating QR code:", err)
      })
  }, [checkpoint])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = qrCodeDataUrl
    link.download = `checkpoint-${checkpoint.id}-qrcode.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>チェックポイント ${checkpoint.id} QRコード</title>
            <style>
              body {
                font-family: sans-serif;
                text-align: center;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              p {
                font-size: 16px;
                margin-bottom: 20px;
              }
              .points {
                font-weight: bold;
                font-size: 18px;
                margin-top: 10px;
              }
              @media print {
                button {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${checkpoint.name}</h1>
              <p>${checkpoint.description || ""}</p>
              <img src="${qrCodeDataUrl}" alt="QR Code" />
              <p class="points">ポイント: ${checkpoint.point_value}</p>
              <p>このQRコードをスキャンしてチェックインしてください</p>
              <button onclick="window.print()">印刷</button>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>チェックポイント QRコード</CardTitle>
        <CardDescription>
          このQRコードを印刷してチェックポイントに設置してください。参加者はこのQRコードをスキャンしてチェックインします。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg mb-4">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-muted">QRコード生成中...</div>
          )}
        </div>

        <div className="w-full space-y-2 text-center">
          <p className="font-bold text-lg">{checkpoint.name}</p>
          <p className="text-sm text-muted-foreground">{checkpoint.description}</p>
          <p className="text-sm">
            ポイント: <span className="font-bold">{checkpoint.point_value}</span>
          </p>
          <p className="text-xs break-all mt-2">{qrCodeUrl}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            ダウンロード
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            印刷用ページ
          </Button>
        </div>
        {onClose && <Button onClick={onClose}>閉じる</Button>}
      </CardFooter>
    </Card>
  )
}

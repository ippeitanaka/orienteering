"use client"

import { useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"

interface Html5QrcodeWrapperProps {
  scanning: boolean
  onScanSuccess: (decodedText: string) => void
  onScanError: (error: any) => void
  onScanFailure: (errorMessage: string) => void
}

export default function Html5QrcodeWrapper({
  scanning,
  onScanSuccess,
  onScanError,
  onScanFailure,
}: Html5QrcodeWrapperProps) {
  const qrCodeRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Html5Qrcodeインスタンスを作成
    if (containerRef.current && !qrCodeRef.current) {
      qrCodeRef.current = new Html5Qrcode("qr-reader")
    }

    // クリーンアップ関数
    return () => {
      if (qrCodeRef.current && qrCodeRef.current.isScanning) {
        qrCodeRef.current.stop().catch((err) => console.error(err))
      }
    }
  }, [])

  useEffect(() => {
    if (!qrCodeRef.current) return

    if (scanning) {
      qrCodeRef.current
        .start(
          { facingMode: "environment" }, // バックカメラを使用
          { fps: 10, qrbox: 250 },
          onScanSuccess,
          onScanError,
        )
        .catch((err) => {
          console.error("QRコードスキャナーの起動に失敗しました:", err)
          onScanFailure("カメラの起動に失敗しました。カメラへのアクセス許可を確認してください。")
        })
    } else {
      if (qrCodeRef.current.isScanning) {
        qrCodeRef.current.stop().catch((err) => console.error(err))
      }
    }
  }, [scanning, onScanSuccess, onScanError, onScanFailure])

  return <div id="qr-reader" ref={containerRef} className="w-full max-w-sm mx-auto"></div>
}

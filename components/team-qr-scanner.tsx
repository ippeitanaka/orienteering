"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, QrCode, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type BarcodeLike = {
  rawValue?: string
}

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeLike[]>
}

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance
}

const resolveCheckpointPath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed)
      if (url.pathname.startsWith("/checkpoint/")) {
        return `${url.pathname}${url.search}`
      }
    } catch {
      return null
    }
  }

  if (trimmed.startsWith("/checkpoint/")) {
    return trimmed
  }

  if (/^(cp_[A-Za-z0-9]+|\d+)$/.test(trimmed)) {
    return `/checkpoint/${trimmed}`
  }

  return null
}

export default function TeamQrScanner() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const scanningRef = useRef(false)

  const [open, setOpen] = useState(false)
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState("カメラを起動すると、その場でチェックポイント QR を読み取れます。")
  const [isStarting, setIsStarting] = useState(false)

  const detectorConstructor = useMemo(() => {
    if (typeof window === "undefined") {
      return null
    }

    return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null
  }, [])

  useEffect(() => {
    setSupported(Boolean(detectorConstructor && navigator.mediaDevices?.getUserMedia))
  }, [detectorConstructor])

  useEffect(() => {
    if (!open) {
      stopScanner()
      setStatus("カメラを起動すると、その場でチェックポイント QR を読み取れます。")
      return
    }

    if (!detectorConstructor || !navigator.mediaDevices?.getUserMedia) {
      setStatus("この端末のブラウザではアプリ内 QR 読み取りに対応していません。標準カメラから QR を開いてください。")
      return
    }

    let cancelled = false

    const startScanner = async () => {
      try {
        setIsStarting(true)
        setStatus("カメラを起動しています...")

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          return
        }

        video.srcObject = stream
        await video.play()

        setStatus("QR コードを枠の中に入れてください。読み取ったら自動で移動します。")
        beginDetection(new detectorConstructor())
      } catch (error) {
        console.error("Failed to start QR scanner:", error)
        setStatus("カメラを起動できませんでした。ブラウザのカメラ権限を確認してください。")
      } finally {
        if (!cancelled) {
          setIsStarting(false)
        }
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [open, detectorConstructor])

  const stopScanner = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    scanningRef.current = false

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }

  const beginDetection = (detector: BarcodeDetectorInstance) => {
    const loop = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        frameRef.current = requestAnimationFrame(() => {
          void loop()
        })
        return
      }

      if (!scanningRef.current) {
        scanningRef.current = true
        try {
          const barcodes = await detector.detect(video)
          const matched = barcodes
            .map((barcode) => barcode.rawValue || "")
            .map((rawValue) => resolveCheckpointPath(rawValue))
            .find(Boolean)

          if (matched) {
            stopScanner()
            setOpen(false)
            router.push(matched)
            return
          }
        } catch (error) {
          console.error("QR detection failed:", error)
        } finally {
          scanningRef.current = false
        }
      }

      frameRef.current = requestAnimationFrame(() => {
        void loop()
      })
    }

    frameRef.current = requestAnimationFrame(() => {
      void loop()
    })
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 gap-2"
        variant="default"
      >
        <QrCode className="h-4 w-4" />
        チェックポイント読み取り
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              チェックポイント QR 読み取り
            </DialogTitle>
            <DialogDescription>
              チームログイン済みのまま、このページ内で QR コードを読み取れます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-zinc-950">
              {supported ? (
                <div className="relative aspect-[3/4] w-full bg-black">
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="h-56 w-full max-w-xs rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 p-6 text-center text-zinc-100">
                  <Camera className="h-10 w-10" />
                  <p className="text-sm leading-6 text-zinc-300">
                    この端末のブラウザではアプリ内 QR 読み取りに対応していません。標準カメラで QR を開く方法を使ってください。
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              {isStarting ? "カメラ起動中です..." : status}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
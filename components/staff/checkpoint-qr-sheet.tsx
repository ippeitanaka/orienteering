"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import type { Checkpoint } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, RefreshCw } from "lucide-react"

interface CheckpointQrSheetProps {
  checkpoint: Checkpoint
  onRegenerate?: (checkpoint: Checkpoint) => Promise<void> | void
}

const buildCheckpointQrIdentifier = (checkpoint: Checkpoint) => checkpoint.qr_token || String(checkpoint.id)

export default function CheckpointQrSheet({ checkpoint, onRegenerate }: CheckpointQrSheetProps) {
  const posterRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const qrUrl = useMemo(() => {
    if (!origin) {
      return ""
    }

    return `${origin}/checkpoint/${buildCheckpointQrIdentifier(checkpoint)}`
  }, [checkpoint, origin])

  const handlePrint = () => {
    if (!posterRef.current || typeof window === "undefined") {
      return
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=1280")
    if (!printWindow) {
      return
    }

    const posterMarkup = posterRef.current.outerHTML
    printWindow.document.write(`
      <html lang="ja">
        <head>
          <title>${checkpoint.name} | QRポスター</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
              background: #f4f0e8;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>${posterMarkup}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleDownloadPdf = async () => {
    if (!posterRef.current) {
      return
    }

    setIsExporting(true)
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f4f0e8",
      })

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297)
      pdf.save(`${checkpoint.name}-qr-poster.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) {
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerate(checkpoint)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={checkpoint.is_moving ? "default" : "outline"}>
          {checkpoint.is_moving ? "移動チェックポイント" : "固定チェックポイント"}
        </Badge>
        <p className="text-sm text-muted-foreground">QRのリンク先: {qrUrl || "読み込み中..."}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          印刷
        </Button>
        <Button variant="outline" onClick={() => void handleDownloadPdf()} disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? "PDF生成中..." : "PDFダウンロード"}
        </Button>
        {onRegenerate ? (
          <Button variant="ghost" onClick={() => void handleRegenerate()} disabled={isRegenerating} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
            QRを再生成
          </Button>
        ) : null}
      </div>

      <div className="overflow-auto rounded-2xl border border-border/60 bg-stone-100 p-4">
        <div
          ref={posterRef}
          style={{
            width: "794px",
            minHeight: "1123px",
            margin: "0 auto",
            background: "linear-gradient(180deg, #f9f4ea 0%, #f5efe3 44%, #efe4d2 100%)",
            color: "#171717",
            fontFamily: '"BIZ UDGothic", "Hiragino Sans", sans-serif',
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(64, 44, 17, 0.18)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0",
              background:
                "radial-gradient(circle at top right, rgba(214, 159, 74, 0.2), transparent 28%), radial-gradient(circle at left 20%, rgba(46, 107, 84, 0.14), transparent 24%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ padding: "56px 56px 40px", position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                marginBottom: "38px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "24px",
                    background: "rgba(255,255,255,0.78)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 16px 34px rgba(90, 65, 23, 0.12)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <img src="/images/elt-logo.png" alt="ELT ロゴ" style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", letterSpacing: "0.2em", color: "#7a5a26", textTransform: "uppercase" }}>
                    ELT Orienteering
                  </p>
                  <h1 style={{ margin: "8px 0 0", fontSize: "40px", lineHeight: 1.2, fontWeight: 700 }}>Checkpoint QR Poster</h1>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "999px",
                  background: checkpoint.is_moving ? "#14532d" : "#ffffff",
                  color: checkpoint.is_moving ? "#ffffff" : "#4b5563",
                  fontSize: "14px",
                  fontWeight: 700,
                  boxShadow: "0 10px 20px rgba(28, 25, 23, 0.08)",
                }}
              >
                {checkpoint.is_moving ? "MOVING CHECKPOINT" : "STATIC CHECKPOINT"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.95fr",
                gap: "28px",
                alignItems: "stretch",
              }}
            >
              <section
                style={{
                  background: "rgba(255,255,255,0.62)",
                  border: "1px solid rgba(120, 113, 108, 0.16)",
                  borderRadius: "32px",
                  padding: "32px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px", letterSpacing: "0.18em", color: "#78716c", textTransform: "uppercase" }}>
                  Checkpoint Name
                </p>
                <h2 style={{ margin: "14px 0 18px", fontSize: "58px", lineHeight: 1.05, fontWeight: 700 }}>{checkpoint.name}</h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "24px",
                  }}
                >
                  <div style={{ padding: "16px 18px", borderRadius: "20px", background: "rgba(245, 158, 11, 0.1)" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#92400e", letterSpacing: "0.14em", textTransform: "uppercase" }}>Point Value</p>
                    <p style={{ margin: "8px 0 0", fontSize: "36px", fontWeight: 700 }}>{checkpoint.point_value} pt</p>
                  </div>
                  <div style={{ padding: "16px 18px", borderRadius: "20px", background: "rgba(15, 118, 110, 0.1)" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#115e59", letterSpacing: "0.14em", textTransform: "uppercase" }}>Checkpoint ID</p>
                    <p style={{ margin: "8px 0 0", fontSize: "36px", fontWeight: 700 }}>#{checkpoint.id}</p>
                  </div>
                </div>

                <div
                  style={{
                    minHeight: "250px",
                    borderRadius: "28px",
                    padding: "24px",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.64))",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#44403c" }}>案内</p>
                  <p style={{ margin: "12px 0 0", fontSize: "18px", lineHeight: 1.8, color: "#292524" }}>
                    {checkpoint.description || "このチェックポイント用の QR コードです。印刷して設置し、参加チームが迷わず見つけられるようにしてください。"}
                  </p>
                  <div style={{ marginTop: "28px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ padding: "10px 14px", borderRadius: "999px", background: "#111827", color: "#fff", fontSize: "13px", fontWeight: 700 }}>
                      1ページ印刷対応
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "999px", background: "rgba(2,132,199,0.12)", color: "#0c4a6e", fontSize: "13px", fontWeight: 700 }}>
                      PDFダウンロード対応
                    </div>
                  </div>
                </div>
              </section>

              <section
                style={{
                  background: "#ffffff",
                  borderRadius: "36px",
                  padding: "28px",
                  border: "1px solid rgba(120, 113, 108, 0.16)",
                  boxShadow: "0 20px 44px rgba(120, 113, 108, 0.12)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ margin: 0, textAlign: "center", fontSize: "14px", letterSpacing: "0.18em", color: "#57534e", textTransform: "uppercase" }}>
                    Scan / Open
                  </p>
                  <div
                    style={{
                      margin: "20px auto 16px",
                      width: "100%",
                      borderRadius: "28px",
                      padding: "22px",
                      background: "linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {qrUrl ? <QRCodeSVG value={qrUrl} size={270} includeMargin bgColor="#ffffff" fgColor="#111111" /> : null}
                  </div>
                  <p style={{ margin: 0, textAlign: "center", fontSize: "15px", lineHeight: 1.7, color: "#44403c" }}>
                    スマートフォンで読み取ると、このチェックポイント専用ページが開きます。
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    padding: "18px",
                    borderRadius: "22px",
                    background: "#1c1917",
                    color: "#fafaf9",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#d6d3d1" }}>
                    Destination URL
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, wordBreak: "break-all" }}>{qrUrl || "読み込み中..."}</p>
                </div>
              </section>
            </div>

            <footer
              style={{
                marginTop: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                padding: "24px 28px",
                background: "rgba(255,255,255,0.52)",
                borderRadius: "28px",
                border: "1px solid rgba(120, 113, 108, 0.12)",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#57534e" }}>東洋医療専門学校 救急救命士学科</p>
                <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 700 }}>学外オリエンテーション</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#78716c" }}>QR Identifier</p>
                <p style={{ margin: "8px 0 0", fontSize: "18px", fontWeight: 700 }}>{buildCheckpointQrIdentifier(checkpoint)}</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
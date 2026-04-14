"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, LogIn, QrCode, Sparkles } from "lucide-react"

interface CheckpointCheckinPanelProps {
  token: string
  checkpointId: number
  checkpointName: string
  pointValue: number
  team: { id: number; name: string; totalScore: number } | null
  alreadyCheckedIn: boolean
}

export default function CheckpointCheckinPanel({
  token,
  checkpointId,
  checkpointName,
  pointValue,
  team,
  alreadyCheckedIn,
}: CheckpointCheckinPanelProps) {
  const [checkedIn, setCheckedIn] = useState(alreadyCheckedIn)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    alreadyCheckedIn
      ? {
          type: "info",
          message: "このチームはこのチェックポイントで既にチェックイン済みです。追加ポイントは加算されません。",
        }
      : null,
  )
  const [teamScore, setTeamScore] = useState(team?.totalScore ?? 0)

  const loginHref = useMemo(() => `/team-login?redirect=${encodeURIComponent(`/checkpoint/${token}`)}`, [token])

  const handleCheckin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/checkpoints/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.status === 409) {
        setCheckedIn(true)
        setTeamScore(data.team?.total_score ?? teamScore)
        setResult({ type: "info", message: data.message || "すでにチェックイン済みです" })
        return
      }

      if (!response.ok) {
        setResult({ type: "error", message: data.error || "チェックインに失敗しました" })
        return
      }

      setCheckedIn(true)
      setTeamScore(data.team?.total_score ?? teamScore)
      setResult({
        type: "success",
        message: data.message || `${pointValue}ポイントを加算しました`,
      })
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "チェックイン中にエラーが発生しました",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/10 bg-white/95 text-zinc-900 shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-amber-700">
          <QrCode className="h-5 w-5" />
          <Badge variant="outline">Team Check-in</Badge>
        </div>
        <CardTitle className="text-3xl font-bold">チーム向けチェックイン</CardTitle>
        <CardDescription>QR を読み取ったチームがこの場で 1 回だけチェックインできます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Checkpoint</p>
            <p className="mt-2 text-lg font-bold">#{checkpointId}</p>
            <p className="text-sm text-zinc-600">{checkpointName}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Award</p>
            <p className="mt-2 text-lg font-bold">+{pointValue} pt</p>
            <p className="text-sm text-amber-800">初回チェックイン時のみ加算</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Team Score</p>
            <p className="mt-2 text-lg font-bold">{teamScore} pt</p>
            <p className="text-sm text-emerald-800">現在の合計スコア</p>
          </div>
        </div>

        {!team ? (
          <Alert variant="warning">
            <LogIn className="h-4 w-4" />
            <AlertTitle>チームログインが必要です</AlertTitle>
            <AlertDescription>
              <p>チェックインするには、先にチームアカウントでログインしてください。</p>
              <p className="mt-2 text-sm">
                未ログインのスマホで QR を読み取った場合も、このチェックポイント画面は開きますが、その時点ではポイントは加算されません。
              </p>
              <p className="mt-2 text-sm">
                下のボタンからログインすると、このチェックポイントページに戻ってそのままチェックインできます。
              </p>
              <div className="mt-3">
                <Link href={loginHref}>
                  <Button className="gap-2">
                    <LogIn className="h-4 w-4" />
                    チームログインへ
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm text-zinc-600">現在ログイン中のチーム</p>
              <p className="mt-2 text-2xl font-bold">{team.name}</p>
            </div>

            {result ? (
              <Alert variant={result.type === "error" ? "destructive" : result.type === "info" ? "warning" : "default"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>
                  {result.type === "success" ? "チェックイン完了" : result.type === "info" ? "すでにチェックイン済み" : "チェックイン失敗"}
                </AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleCheckin()} disabled={loading || checkedIn} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                {checkedIn ? "チェックイン済み" : loading ? "チェックイン中..." : `${pointValue}ポイントでチェックイン`}
              </Button>
              <p className="text-sm text-zinc-500">1 チームにつきこのチェックポイントでの加算は 1 回のみです。</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
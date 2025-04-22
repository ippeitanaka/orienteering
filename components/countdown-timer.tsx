"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTimerSettings, type TimerSettings } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { AlertCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CountdownTimerProps {
  isStaff?: boolean
}

export default function CountdownTimer({ isStaff = false }: CountdownTimerProps) {
  const [timerSettings, setTimerSettings] = useState<TimerSettings | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // タイマー設定を取得
  useEffect(() => {
    async function fetchTimerSettings() {
      try {
        const settings = await getTimerSettings()
        setTimerSettings(settings)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching timer settings:", err)
        setError("タイマー設定の取得に失敗しました")
        setLoading(false)
      }
    }

    fetchTimerSettings()

    // リアルタイム更新のサブスクリプションを設定
    const subscription = supabase
      .channel("timer_settings_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timer_settings" }, (payload) => {
        console.log("Timer settings changed:", payload)
        // 変更があった場合は設定を更新
        fetchTimerSettings()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // タイマーのカウントダウン処理
  useEffect(() => {
    if (!timerSettings || !timerSettings.is_running || !timerSettings.end_time) {
      setTimeLeft(timerSettings?.duration || null)
      return
    }

    const endTime = new Date(timerSettings.end_time).getTime()

    const updateTimeLeft = () => {
      const now = Date.now()
      const diff = Math.max(0, endTime - now)

      if (diff <= 0) {
        setTimeLeft(0)
        return
      }

      setTimeLeft(Math.floor(diff / 1000))
    }

    // 初回実行
    updateTimeLeft()

    // 1秒ごとに更新
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [timerSettings])

  // 時間のフォーマット
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "--:--:--"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":")
  }

  if (loading) {
    return (
      <Card className="cute-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            カウントダウンタイマー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="cute-card">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            カウントダウンタイマー
          </CardTitle>
          {timerSettings?.is_running ? (
            <Badge variant="default" className="animate-pulse">
              実行中
            </Badge>
          ) : (
            <Badge variant="outline">停止中</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-mono font-bold tabular-nums tracking-wider text-center py-4">
            {formatTime(timeLeft)}
          </div>
          {!isStaff && timerSettings?.is_running && (
            <p className="text-sm text-muted-foreground">残り時間です。時間内に全チェックポイントを回りましょう！</p>
          )}
          {!isStaff && !timerSettings?.is_running && (
            <p className="text-sm text-muted-foreground">タイマーは現在停止中です。スタッフの指示をお待ちください。</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

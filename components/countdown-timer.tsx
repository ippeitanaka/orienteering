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
  const [retryCount, setRetryCount] = useState(0)

  // タイマー設定を取得
  useEffect(() => {
    async function fetchTimerSettings() {
      try {
        const settings = await getTimerSettings()
        setTimerSettings(settings)
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error("Error fetching timer settings:", err)

        // 最大3回までリトライ
        if (retryCount < 3) {
          console.log(`Retrying timer settings fetch (${retryCount + 1}/3)...`)
          setRetryCount((prev) => prev + 1)
          setTimeout(fetchTimerSettings, 2000) // 2秒後にリトライ
        } else {
          setError("タイマー設定の取得に失敗しました")
          setLoading(false)

          // エラー時のフォールバック設定
          setTimerSettings({
            duration: 3600,
            end_time: null,
            is_running: false,
          })
        }
      }
    }

    fetchTimerSettings()

    // リアルタイム更新のサブスクリプションを設定
    let subscription: any = null

    try {
      subscription = supabase
        .channel("timer_settings_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "timer_settings" }, (payload) => {
          console.log("Timer settings changed:", payload)
          // 変更があった場合は設定を更新
          fetchTimerSettings()
        })
        .subscribe((status) => {
          console.log("Subscription status:", status)
        })
    } catch (err) {
      console.error("Error setting up subscription:", err)
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch (err) {
          console.error("Error unsubscribing:", err)
        }
      }
    }
  }, [retryCount])

  // タイマーのカウントダウン処理
  useEffect(() => {
    if (!timerSettings) {
      return
    }

    if (!timerSettings.is_running || !timerSettings.end_time) {
      setTimeLeft(timerSettings.duration || null)
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
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            カウントダウンタイマー
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-center items-center h-12 sm:h-16">
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !timerSettings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="cute-card">
      <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            カウントダウンタイマー
          </CardTitle>
          {timerSettings?.is_running ? (
            <Badge variant="default" className="animate-pulse text-xs">
              実行中
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              停止中
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col items-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold tabular-nums tracking-wider text-center py-2 sm:py-4">
            {formatTime(timeLeft)}
          </div>
          {!isStaff && timerSettings?.is_running && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              残り時間です。時間内に全チェックポイントを回りましょう！
            </p>
          )}
          {!isStaff && !timerSettings?.is_running && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              タイマーは現在停止中です。スタッフの指示をお待ちください。
            </p>
          )}
          {error && (
            <Alert variant="warning" className="mt-2">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

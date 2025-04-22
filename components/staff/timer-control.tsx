"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Play, Square, Clock, RefreshCw } from "lucide-react"
import { getTimerSettings, startTimer, stopTimer, type TimerSettings } from "@/lib/supabase"
import CountdownTimer from "@/components/countdown-timer"

export default function TimerControl() {
  const [timerSettings, setTimerSettings] = useState<TimerSettings | null>(null)
  const [hours, setHours] = useState<number>(0)
  const [minutes, setMinutes] = useState<number>(0)
  const [seconds, setSeconds] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    fetchTimerSettings()
  }, [retryCount])

  const fetchTimerSettings = async () => {
    try {
      setLoading(true)
      const settings = await getTimerSettings()
      setTimerSettings(settings)
      setError(null)

      if (settings) {
        // 現在の設定から時間、分、秒を設定
        const totalSeconds = settings.duration || 0
        setHours(Math.floor(totalSeconds / 3600))
        setMinutes(Math.floor((totalSeconds % 3600) / 60))
        setSeconds(totalSeconds % 60)
      } else {
        // デフォルト値を設定
        setHours(1)
        setMinutes(0)
        setSeconds(0)
      }
    } catch (err) {
      console.error("Error fetching timer settings:", err)

      // 最大3回までリトライ
      if (retryCount < 3) {
        console.log(`Retrying timer settings fetch (${retryCount + 1}/3)...`)
        setRetryCount((prev) => prev + 1)
        setTimeout(fetchTimerSettings, 2000) // 2秒後にリトライ
      } else {
        setError("タイマー設定の取得に失敗しました")

        // デフォルト値を設定
        setHours(1)
        setMinutes(0)
        setSeconds(0)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStartTimer = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 時間を秒に変換
      const totalSeconds = hours * 3600 + minutes * 60 + seconds

      if (totalSeconds <= 0) {
        setError("タイマーの時間を設定してください")
        setLoading(false)
        return
      }

      console.log(`Starting timer with ${totalSeconds} seconds`)
      const result = await startTimer(totalSeconds)

      if (result) {
        setSuccess("タイマーを開始しました")
        fetchTimerSettings()
      } else {
        setError("タイマーの開始に失敗しました")
      }
    } catch (err) {
      console.error("Error starting timer:", err)
      setError("タイマーの開始中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const handleStopTimer = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("Stopping timer")
      const result = await stopTimer()

      if (result) {
        setSuccess("タイマーを停止しました")
        fetchTimerSettings()
      } else {
        setError("タイマーの停止に失敗しました")
      }
    } catch (err) {
      console.error("Error stopping timer:", err)
      setError("タイマーの停止中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <CountdownTimer isStaff={true} />

      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            タイマー設定
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="hours" className="text-xs sm:text-sm">
                  時間
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  disabled={loading || timerSettings?.is_running}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="minutes" className="text-xs sm:text-sm">
                  分
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  disabled={loading || timerSettings?.is_running}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="seconds" className="text-xs sm:text-sm">
                  秒
                </Label>
                <Input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  disabled={loading || timerSettings?.is_running}
                  className="h-8 sm:h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
              <Button
                onClick={handleStartTimer}
                disabled={loading || timerSettings?.is_running}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                size="sm"
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                タイマー開始
              </Button>
              <Button
                onClick={handleStopTimer}
                disabled={loading || !timerSettings?.is_running}
                variant="destructive"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                size="sm"
              >
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                タイマー停止
              </Button>
              <Button
                onClick={fetchTimerSettings}
                variant="outline"
                disabled={loading}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                size="sm"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                更新
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default">
                <AlertDescription className="text-xs sm:text-sm">{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

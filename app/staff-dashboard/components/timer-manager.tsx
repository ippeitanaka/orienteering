"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Timer } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Clock, Play, Square, RotateCcw, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function TimerManager() {
  const { toast } = useToast()
  const [timer, setTimer] = useState<Timer | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [duration, setDuration] = useState(60) // デフォルト60分
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // タイマー情報を取得する関数
  const fetchTimer = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/timer")
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const result = await response.json()
      if (result.success && result.data) {
        setTimer(result.data)
        calculateTimeLeft(result.data)
      }
    } catch (err) {
      console.error("Error fetching timer:", err)
      toast({
        title: "エラー",
        description: "タイマー情報の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 残り時間を計算する関数
  const calculateTimeLeft = (timerData: Timer) => {
    if (timerData.status === "not_started") {
      setTimeLeft(null)
      return
    }

    if (timerData.status === "finished") {
      setTimeLeft(0)
      return
    }

    if (!timerData.end_time) {
      setTimeLeft(null)
      return
    }

    const endTime = new Date(timerData.end_time).getTime()
    const now = new Date().getTime()
    const difference = endTime - now

    if (difference <= 0) {
      setTimeLeft(0)
    } else {
      setTimeLeft(Math.floor(difference / 1000))
    }
  }

  // コンポーネントマウント時にタイマー情報を取得
  useEffect(() => {
    fetchTimer()

    // リアルタイム更新のためのサブスクリプション
    const subscription = supabase
      .channel("timer-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "timer",
        },
        (payload) => {
          setTimer(payload.new as Timer)
          calculateTimeLeft(payload.new as Timer)
        },
      )
      .subscribe()

    // 1秒ごとに残り時間を更新
    const interval = setInterval(() => {
      if (timer && timer.status === "running") {
        calculateTimeLeft(timer)
      }
    }, 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  // タイマーが更新されたときに残り時間を再計算
  useEffect(() => {
    if (timer) {
      calculateTimeLeft(timer)
    }
  }, [timer])

  // タイマーを開始する関数
  const handleStartTimer = async () => {
    try {
      setActionLoading(true)
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          duration,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "成功",
          description: result.message,
        })
        fetchTimer()
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error starting timer:", err)
      toast({
        title: "エラー",
        description: "タイマーの開始に失敗しました",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // タイマーを停止する関数
  const handleStopTimer = async () => {
    try {
      setActionLoading(true)
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "stop",
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "成功",
          description: result.message,
        })
        fetchTimer()
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error stopping timer:", err)
      toast({
        title: "エラー",
        description: "タイマーの停止に失敗しました",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // タイマーをリセットする関数
  const handleResetTimer = async () => {
    try {
      setActionLoading(true)
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset",
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "成功",
          description: result.message,
        })
        fetchTimer()
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error resetting timer:", err)
      toast({
        title: "エラー",
        description: "タイマーのリセットに失敗しました",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // 残り時間をフォーマットする関数
  const formatTimeLeft = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [
      hours > 0 ? hours.toString().padStart(2, "0") : null,
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>タイマー管理</CardTitle>
        <CardDescription>オリエンテーリングの制限時間を設定・管理します</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* タイマーステータス表示 */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">現在のステータス</h3>
                </div>
                <div>
                  {timer?.status === "not_started" && (
                    <span className="bg-muted-foreground/20 text-muted-foreground text-xs px-2 py-1 rounded-full">
                      開始前
                    </span>
                  )}
                  {timer?.status === "running" && (
                    <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">進行中</span>
                  )}
                  {timer?.status === "finished" && (
                    <span className="bg-destructive/20 text-destructive text-xs px-2 py-1 rounded-full">終了</span>
                  )}
                </div>
              </div>

              {timer?.status === "running" && (
                <div className="flex flex-col items-center mt-4">
                  <div className="text-sm text-muted-foreground mb-1">残り時間</div>
                  <div
                    className={`font-mono text-3xl font-bold ${
                      timeLeft !== null && timeLeft <= 300 ? "text-destructive animate-pulse" : ""
                    }`}
                  >
                    {timeLeft !== null ? formatTimeLeft(timeLeft) : "--:--"}
                  </div>
                  {timeLeft !== null && timeLeft <= 300 && (
                    <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>残り時間が5分を切っています</span>
                    </div>
                  )}
                </div>
              )}

              {timer?.status === "finished" && (
                <div className="text-center mt-4 text-destructive">
                  <p className="font-medium">タイマーが終了しました</p>
                </div>
              )}
            </div>

            {/* タイマー設定フォーム */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">制限時間（分）</Label>
                <div className="flex gap-2">
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="240"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    disabled={timer?.status === "running" || actionLoading}
                  />
                  <Button
                    onClick={handleStartTimer}
                    disabled={timer?.status === "running" || actionLoading}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    開始
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleStopTimer}
                  disabled={timer?.status !== "running" || actionLoading}
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  停止
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetTimer}
                  disabled={timer?.status === "running" || actionLoading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  リセット
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

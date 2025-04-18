"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Timer } from "@/lib/supabase"
import { Clock, AlertTriangle } from "lucide-react"

interface CountdownTimerProps {
  compact?: boolean
  showTitle?: boolean
}

export default function CountdownTimer({ compact = false, showTitle = true }: CountdownTimerProps) {
  const [timer, setTimer] = useState<Timer | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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

  // 残り時間をフォーマットする関数
  const formatTimeLeft = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (compact) {
      return [hours > 0 ? `${hours}h` : null, `${minutes}m`, `${secs}s`].filter(Boolean).join(" ")
    }

    return [
      hours > 0 ? hours.toString().padStart(2, "0") : null,
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":")
  }

  if (loading) {
    return null
  }

  if (!timer || timer.status === "not_started") {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <Clock className="h-4 w-4" />
        <span className={`font-mono ${timeLeft !== null && timeLeft <= 300 ? "text-destructive font-bold" : ""}`}>
          {timeLeft !== null ? formatTimeLeft(timeLeft) : "--:--"}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-muted p-4 rounded-lg mb-4">
      {showTitle && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-medium">制限時間</h3>
          </div>
          <div>
            {timer.status === "running" && (
              <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">進行中</span>
            )}
            {timer.status === "finished" && (
              <span className="bg-destructive/20 text-destructive text-xs px-2 py-1 rounded-full">終了</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div
          className={`font-mono text-3xl font-bold ${
            timeLeft !== null && timeLeft <= 300 ? "text-destructive animate-pulse" : ""
          }`}
        >
          {timeLeft !== null ? formatTimeLeft(timeLeft) : "--:--"}
        </div>
        {timeLeft !== null && timeLeft <= 300 && timer.status === "running" && (
          <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>残り時間が5分を切っています</span>
          </div>
        )}
        {timer.status === "finished" && (
          <div className="text-center mt-2 text-destructive">
            <p className="font-medium">制限時間が終了しました</p>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { updateTeamLocation } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// 位置情報更新イベントのカスタムイベント
export const LOCATION_UPDATED_EVENT = "locationUpdated"

interface LocationTrackerProps {
  onLocationUpdate?: () => void // 位置情報更新時のコールバック
}

export default function LocationTracker({ onLocationUpdate }: LocationTrackerProps) {
  const { toast } = useToast()
  const [teamId, setTeamId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("位置情報を取得中...")
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true) // 自動更新の状態
  const [updateInterval, setUpdateInterval] = useState(180) // 更新間隔（秒）- 3分に変更
  const locationTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [updateCountdown, setUpdateCountdown] = useState(updateInterval)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)

    // クライアントサイドでのみ実行されるコード
    if (typeof window !== "undefined") {
      // チームIDを取得
      const storedTeamId = localStorage.getItem("teamId")
      if (storedTeamId) {
        setTeamId(Number.parseInt(storedTeamId))
      }

      // 位置情報の権限を確認
      if (navigator.permissions) {
        navigator.permissions.query({ name: "geolocation" }).then((result) => {
          if (result.state === "granted") {
            setPermissionGranted(true)
            startTracking()
          } else if (result.state === "prompt") {
            requestPermission()
          } else {
            setPermissionGranted(false)
            setStatus("位置情報へのアクセスが拒否されています。設定から許可してください。")
          }

          // 権限状態の変更を監視
          result.addEventListener("change", () => {
            if (result.state === "granted") {
              setPermissionGranted(true)
              startTracking()
            } else {
              setPermissionGranted(false)
              stopTracking()
            }
          })
        })
      } else {
        requestPermission()
      }
    }

    return () => {
      // コンポーネントのアンマウント時にクリーンアップ
      stopTracking()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  // 自動更新の状態が変わったときの処理
  useEffect(() => {
    if (autoUpdate) {
      startAutoUpdate()
    } else {
      stopAutoUpdate()
    }

    return () => {
      stopAutoUpdate()
    }
  }, [autoUpdate, updateInterval])

  // カウントダウンの処理
  useEffect(() => {
    if (autoUpdate && permissionGranted) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      setUpdateCountdown(updateInterval)

      countdownIntervalRef.current = setInterval(() => {
        setUpdateCountdown((prev) => {
          if (prev <= 1) {
            updateLocation()
            return updateInterval
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [autoUpdate, permissionGranted, updateInterval])

  const requestPermission = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionGranted(true)
        startTracking()
      },
      (error) => {
        console.error("位置情報の取得に失敗しました:", error)
        setPermissionGranted(false)
        setStatus("位置情報へのアクセスが拒否されています。設定から許可してください。")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const startTracking = () => {
    if (!teamId || typeof window === "undefined" || !navigator.geolocation) return

    setIsTracking(true)

    // 現在位置を取得して送信
    updateLocation()

    // 位置情報の変更を監視（より頻繁に更新）
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          updateTeamLocationOnServer(latitude, longitude)
        },
        (error) => {
          console.error("位置情報の監視中にエラーが発生しました:", error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
    }

    // 自動更新を開始
    if (autoUpdate) {
      startAutoUpdate()
    }

    setStatus("位置情報のトラッキングを開始しました")
  }

  const stopTracking = () => {
    setIsTracking(false)
    stopAutoUpdate()

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  // 自動更新を開始
  const startAutoUpdate = () => {
    if (locationTrackingIntervalRef.current) {
      clearInterval(locationTrackingIntervalRef.current)
    }

    // 指定した間隔で位置情報を更新
    locationTrackingIntervalRef.current = setInterval(updateLocation, updateInterval * 1000)
  }

  // 自動更新を停止
  const stopAutoUpdate = () => {
    if (locationTrackingIntervalRef.current) {
      clearInterval(locationTrackingIntervalRef.current)
      locationTrackingIntervalRef.current = null
    }
  }

  const updateLocation = () => {
    if (!teamId || typeof window === "undefined" || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        updateTeamLocationOnServer(latitude, longitude)
      },
      (error) => {
        console.error("位置情報の取得に失敗しました:", error)
        setStatus(`位置情報の取得に失敗しました: ${getGeolocationErrorMessage(error)}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const updateTeamLocationOnServer = async (latitude: number, longitude: number) => {
    if (!teamId) return
    setIsUpdating(true)

    try {
      await updateTeamLocation(teamId, latitude, longitude)
      const now = new Date().toLocaleTimeString()
      setStatus(`最終更新: ${now}`)
      setLastUpdateTime(now)
      setLastPosition({ latitude, longitude })
      console.log("位置情報を更新しました:", latitude, longitude)

      // 位置情報更新イベントを発火
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LOCATION_UPDATED_EVENT))
      }

      // コールバックがあれば実行
      if (onLocationUpdate) {
        onLocationUpdate()
      }
    } catch (error) {
      console.error("位置情報の更新に失敗しました:", error)
      setStatus("位置情報の更新に失敗しました")

      toast({
        title: "エラー",
        description: "位置情報の更新に失敗しました",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // 位置情報エラーメッセージを取得
  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "位置情報へのアクセスが拒否されました。ブラウザの設定から許可してください。"
      case error.POSITION_UNAVAILABLE:
        return "位置情報が利用できません。"
      case error.TIMEOUT:
        return "位置情報の取得がタイムアウトしました。"
      default:
        return "不明なエラーが発生しました。"
    }
  }

  // 手動で位置情報を更新
  const handleManualUpdate = () => {
    updateLocation()
  }

  // 自動更新の切り替え
  const toggleAutoUpdate = () => {
    setAutoUpdate(!autoUpdate)
  }

  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return null
  }

  if (permissionGranted === null) {
    return null // 権限確認中は何も表示しない
  }

  if (permissionGranted === false) {
    return (
      <Alert variant="destructive" className="rounded-xl">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-medium">位置情報へのアクセスが必要です</AlertTitle>
        <AlertDescription>
          <p className="mb-2">このアプリはチームの位置を追跡するために位置情報へのアクセスが必要です。</p>
        </AlertDescription>
      </Alert>
    )
  }

  // カウントダウン表示部分を改善
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="bg-muted p-3 rounded-md text-sm">
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="font-medium">{status}</p>
          {lastPosition && (
            <p className="text-xs text-muted-foreground mt-1">
              位置: {lastPosition.latitude.toFixed(6)}, {lastPosition.longitude.toFixed(6)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={handleManualUpdate} disabled={isUpdating}>
          {isUpdating ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1"></div>
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          更新
        </Button>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted-foreground/20">
        <div className="flex items-center space-x-2">
          <Switch id="auto-update" checked={autoUpdate} onCheckedChange={toggleAutoUpdate} />
          <Label htmlFor="auto-update" className="cursor-pointer">
            自動更新 {autoUpdate && updateCountdown && `(${formatCountdown(updateCountdown)})`}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUpdateInterval(Math.max(60, updateInterval - 30))}
            disabled={updateInterval <= 60}
          >
            -
          </Button>
          <span className="text-xs">
            {Math.floor(updateInterval / 60)}分{updateInterval % 60 > 0 ? `${updateInterval % 60}秒` : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUpdateInterval(Math.min(600, updateInterval + 30))}
            disabled={updateInterval >= 600}
          >
            +
          </Button>
        </div>
      </div>

      {autoUpdate && (
        <div className="w-full bg-muted-foreground/10 h-1 mt-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(updateCountdown / updateInterval) * 100}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}

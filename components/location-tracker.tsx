"use client"

import { useState, useEffect, useRef } from "react"
import { updateTeamLocation } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, MapPin } from "lucide-react"

export default function LocationTracker() {
  const [teamId, setTeamId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("位置情報を取得中...")
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const locationTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)

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
    }
  }, [])

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

    // バックアップとして定期的に位置情報を更新（1分ごと）
    locationTrackingIntervalRef.current = setInterval(updateLocation, 60 * 1000)
    setStatus("位置情報のトラッキングを開始しました")
  }

  const stopTracking = () => {
    setIsTracking(false)
    if (locationTrackingIntervalRef.current) {
      clearInterval(locationTrackingIntervalRef.current)
      locationTrackingIntervalRef.current = null
    }

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
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

    try {
      await updateTeamLocation(teamId, latitude, longitude)
      const now = new Date().toLocaleTimeString()
      setStatus(`最終更新: ${now}`)
      setLastUpdateTime(now)
      setLastPosition({ latitude, longitude })
      console.log("位置情報を更新しました:", latitude, longitude)
    } catch (error) {
      console.error("位置情報の更新に失敗しました:", error)
      setStatus("位置情報の更新に失敗しました")
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

  return (
    <div className="bg-muted p-3 rounded-md text-sm">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{status}</p>
          {lastPosition && (
            <p className="text-xs text-muted-foreground mt-1">
              位置: {lastPosition.latitude.toFixed(6)}, {lastPosition.longitude.toFixed(6)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={handleManualUpdate}>
          <MapPin className="h-4 w-4 mr-1" />
          更新
        </Button>
      </div>
    </div>
  )
}

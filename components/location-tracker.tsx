"use client"

import { useState, useEffect, useRef } from "react"
import { getTeamMapSettings, updateTeamLocation } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 位置情報更新イベントのカスタムイベント
export const LOCATION_UPDATED_EVENT = "locationUpdated"

interface LocationTrackerProps {
  onLocationUpdate?: () => void // 位置情報更新時のコールバック
  onPositionChange?: (position: { latitude: number; longitude: number }) => void
}

export default function LocationTracker({ onLocationUpdate, onPositionChange }: LocationTrackerProps) {
  const { toast } = useToast()
  const [teamId, setTeamId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>("位置情報を取得中...")
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [autoUpdate, setAutoUpdate] = useState(true) // 自動更新の状態
  const [updateInterval, setUpdateInterval] = useState(180) // 更新間隔（秒）- 3分に変更
  const locationTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)

    const loadSettings = async () => {
      try {
        const settings = await getTeamMapSettings()
        setAutoUpdate(settings.team_location_auto_update_enabled)
        setUpdateInterval(settings.team_location_update_interval_seconds)
      } catch (error) {
        console.error("Failed to load team map settings:", error)
      }
    }

    // クライアントサイドでのみ実行されるコード
    if (typeof window !== "undefined") {
      void loadSettings()

      // デバイスを識別する永続IDを作成/復元
      const existingDeviceId = localStorage.getItem("teamLocationDeviceId")
      if (existingDeviceId) {
        setDeviceId(existingDeviceId)
      } else {
        const generatedDeviceId =
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`) || `${Date.now()}`
        localStorage.setItem("teamLocationDeviceId", generatedDeviceId)
        setDeviceId(generatedDeviceId)
      }

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
    if (!teamId || !deviceId) return

    try {
      await updateTeamLocation(teamId, latitude, longitude, deviceId)
      onPositionChange?.({ latitude, longitude })
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
      const message = error instanceof Error ? error.message : "位置情報の更新に失敗しました"
      setStatus(message)

      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
        duration: 3000,
      })
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

  return null
}

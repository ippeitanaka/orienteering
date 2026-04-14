"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateStaffLocation } from "@/lib/supabase"
import { LocateFixed, RefreshCw, Route } from "lucide-react"

export default function StaffLocationTracker() {
  const [staffId, setStaffId] = useState<number | null>(null)
  const [staffName, setStaffName] = useState("スタッフ")
  const [autoShare, setAutoShare] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [status, setStatus] = useState("位置共有は停止中です")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const storedStaffId = localStorage.getItem("staffId")
    const storedStaffName = localStorage.getItem("staffName")

    if (storedStaffId) {
      setStaffId(Number.parseInt(storedStaffId, 10))
    }

    if (storedStaffName) {
      setStaffName(storedStaffName)
    }
  }, [])

  useEffect(() => {
    if (!autoShare || !staffId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    void shareLocation()
    intervalRef.current = setInterval(() => {
      void shareLocation()
    }, 20000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoShare, staffId])

  const shareLocation = async () => {
    if (!staffId || !navigator.geolocation) {
      return
    }

    setIsUpdating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          await updateStaffLocation(staffId, latitude, longitude)
          setLastPosition({ latitude, longitude })
          setLastUpdatedAt(new Date().toLocaleTimeString())
          setStatus("現在地を移動チェックポイント用に共有中です")
        } catch (error) {
          console.error("Failed to update staff location:", error)
          setStatus("位置共有の更新に失敗しました")
        } finally {
          setIsUpdating(false)
        }
      },
      (error) => {
        console.error("Failed to get current staff location:", error)
        setStatus("位置情報の取得に失敗しました")
        setIsUpdating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Route className="h-4 w-4 sm:h-5 sm:w-5" />
          移動チェックポイント位置共有
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {staffName} の現在地を、担当している移動チェックポイントの位置として反映します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="auto-share" className="font-medium">
              自動共有
            </Label>
            <p className="text-xs text-muted-foreground">20秒ごとに現在地を更新します</p>
          </div>
          <Switch id="auto-share" checked={autoShare} onCheckedChange={setAutoShare} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void shareLocation()} disabled={!staffId || isUpdating}>
            {isUpdating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            現在地を送信
          </Button>
          {lastUpdatedAt ? <span className="text-xs text-muted-foreground">最終更新: {lastUpdatedAt}</span> : null}
        </div>

        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>

        {lastPosition ? (
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            緯度: {lastPosition.latitude.toFixed(6)} / 経度: {lastPosition.longitude.toFixed(6)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
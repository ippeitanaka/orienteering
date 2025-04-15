"use client"

import { useState, useEffect } from "react"
import { getCheckpoints, getTeamLocations, type Checkpoint, type Team, type TeamLocation } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Locate, Map } from "lucide-react"

interface SimpleMapViewProps {
  teams: Team[]
}

export default function SimpleMapView({ teams }: SimpleMapViewProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    async function fetchData() {
      try {
        const checkpointsData = await getCheckpoints()
        setCheckpoints(checkpointsData)

        const locationsData = await getTeamLocations()
        setTeamLocations(locationsData)

        setLoading(false)

        // データ取得後に現在位置を取得
        if (typeof window !== "undefined" && navigator.geolocation) {
          getCurrentLocation()
        }
      } catch (err) {
        console.error("Failed to fetch map data:", err)
        setLoading(false)
        setError("マップデータの取得に失敗しました")
      }
    }

    if (isMounted) {
      fetchData()
    }

    // 1分ごとにチームの位置情報を更新
    let interval: NodeJS.Timeout | null = null
    if (isMounted) {
      interval = setInterval(async () => {
        try {
          const locationsData = await getTeamLocations()
          setTeamLocations(locationsData)
        } catch (err) {
          console.error("Failed to update team locations:", err)
        }
      }, 60000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isMounted])

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("お使いのブラウザは位置情報をサポートしていません")
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        console.log("現在位置を取得しました:", latitude, longitude)
        setPosition({ latitude, longitude })
        setLocating(false)
      },
      (error) => {
        console.error("位置情報の取得に失敗しました:", error)
        alert("位置情報の取得に失敗しました。位置情報の許可を確認してください。")
        setLocating(false)
      },
      {
        enableHighAccuracy: true, // 高精度の位置情報を取得
        timeout: 10000, // 10秒でタイムアウト
        maximumAge: 0, // キャッシュを使用しない
      },
    )
  }

  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm">マップを準備中...</p>
        </div>
      </div>
    )
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // 最も近いチェックポイントを計算
  const findNearestCheckpoint = () => {
    if (!position || checkpoints.length === 0) return null

    let nearest = checkpoints[0]
    let minDistance = calculateDistance(position.latitude, position.longitude, nearest.latitude, nearest.longitude)

    checkpoints.forEach((checkpoint) => {
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        checkpoint.latitude,
        checkpoint.longitude,
      )
      if (distance < minDistance) {
        minDistance = distance
        nearest = checkpoint
      }
    })

    return {
      checkpoint: nearest,
      distance: minDistance,
    }
  }

  // 2点間の距離を計算（ハーバーサイン公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // 地球の半径（メートル）
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // メートル単位の距離
  }

  const nearestInfo = position ? findNearestCheckpoint() : null

  return (
    <div className="space-y-4">
      <Alert variant="default" className="rounded-xl border-2 border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>シンプルマップモード</AlertTitle>
        <AlertDescription>
          <p>現在、シンプルマップモードで表示しています。位置情報のみ表示されます。</p>
          <p className="text-sm mt-1">
            {position ? "現在地を表示しています。" : "「現在地を表示」ボタンをクリックして、現在位置を表示できます。"}
          </p>
        </AlertDescription>
      </Alert>

      <div className="relative">
        <div className="h-[400px] rounded-xl overflow-hidden border-2 border-primary/20 bg-muted/50 p-4">
          <div className="flex flex-col h-full justify-center items-center">
            {position ? (
              <div className="text-center space-y-4">
                <div className="bg-primary/20 p-4 rounded-full inline-block">
                  <Map className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">現在地</h3>
                  <p className="text-sm">緯度: {position.latitude.toFixed(6)}</p>
                  <p className="text-sm">経度: {position.longitude.toFixed(6)}</p>

                  {nearestInfo && (
                    <div className="mt-4 p-3 bg-white/80 rounded-lg">
                      <p className="font-medium">最も近いチェックポイント:</p>
                      <p className="font-bold">{nearestInfo.checkpoint.name}</p>
                      <p className="text-sm">
                        距離:{" "}
                        {nearestInfo.distance < 1000
                          ? `${nearestInfo.distance.toFixed(0)}m`
                          : `${(nearestInfo.distance / 1000).toFixed(2)}km`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p>マップを表示するには現在地を取得してください</p>
                <Button
                  onClick={getCurrentLocation}
                  disabled={locating}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {locating ? (
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <Locate className="h-5 w-5 mr-2" />
                  )}
                  現在地を取得
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* チェックポイント一覧 */}
        <Card className="cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="font-heading text-primary">チェックポイント一覧</CardTitle>
            <CardDescription>全{checkpoints.length}箇所</CardDescription>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {checkpoints.map((checkpoint) => (
                <li key={checkpoint.id} className="p-2 bg-muted rounded-md">
                  <p className="font-medium">{checkpoint.name}</p>
                  <p className="text-xs text-muted-foreground">
                    位置: {checkpoint.latitude.toFixed(6)}, {checkpoint.longitude.toFixed(6)}
                  </p>
                  {position && (
                    <p className="text-xs text-primary font-medium mt-1">
                      距離:{" "}
                      {calculateDistance(
                        position.latitude,
                        position.longitude,
                        checkpoint.latitude,
                        checkpoint.longitude,
                      ) < 1000
                        ? `${calculateDistance(
                            position.latitude,
                            position.longitude,
                            checkpoint.latitude,
                            checkpoint.longitude,
                          ).toFixed(0)}m`
                        : `${(
                            calculateDistance(
                              position.latitude,
                              position.longitude,
                              checkpoint.latitude,
                              checkpoint.longitude,
                            ) / 1000
                          ).toFixed(2)}km`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* チーム位置情報 */}
        <Card className="cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="font-heading text-primary">チーム位置情報</CardTitle>
            <CardDescription>全{teamLocations.length}チーム</CardDescription>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {teamLocations.map((location) => {
                const team = teams.find((t) => t.id === location.team_id)
                if (!team) return null

                return (
                  <li key={location.id} className="p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                      <p className="font-medium">{team.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      位置: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最終更新: {new Date(location.timestamp).toLocaleTimeString()}
                    </p>
                    {position && (
                      <p className="text-xs text-primary font-medium mt-1">
                        距離:{" "}
                        {calculateDistance(
                          position.latitude,
                          position.longitude,
                          location.latitude,
                          location.longitude,
                        ) < 1000
                          ? `${calculateDistance(
                              position.latitude,
                              position.longitude,
                              location.latitude,
                              location.longitude,
                            ).toFixed(0)}m`
                          : `${(
                              calculateDistance(
                                position.latitude,
                                position.longitude,
                                location.latitude,
                                location.longitude,
                              ) / 1000
                            ).toFixed(2)}km`}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

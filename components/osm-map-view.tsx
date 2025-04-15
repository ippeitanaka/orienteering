"use client"

import { useState, useEffect, useRef } from "react"
import { getCheckpoints, getTeamLocations, type Checkpoint, type Team, type TeamLocation } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Locate } from 'lucide-react'
import Script from "next/script"

interface OSMMapViewProps {
  teams: Team[]
}

export default function OSMMapView({ teams }: OSMMapViewProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // マップとマーカーの参照を保持
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const currentPositionMarkerRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // データの取得
  useEffect(() => {
    async function fetchData() {
      try {
        const checkpointsData = await getCheckpoints()
        setCheckpoints(checkpointsData)

        const locationsData = await getTeamLocations()
        setTeamLocations(locationsData)

        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch map data:", err)
        setLoading(false)
        setError("マップデータの取得に失敗しました")
      }
    }

    fetchData()

    // 1分ごとにチームの位置情報を更新
    const interval = setInterval(async () => {
      try {
        const locationsData = await getTeamLocations()
        setTeamLocations(locationsData)
      } catch (err) {
        console.error("Failed to update team locations:", err)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Leafletが読み込まれたら初期化
  useEffect(() => {
    if (leafletLoaded && !mapInitialized && mapContainerRef.current && !loading) {
      initializeMap()
    }
  }, [leafletLoaded, mapInitialized, loading])

  // マップの初期化
  const initializeMap = () => {
    try {
      if (!window.L || !mapContainerRef.current || mapRef.current) {
        setDebugInfo(prev => prev + "\nマップ初期化条件が満たされていません: " + 
          `window.L=${!!window.L}, mapContainer=${!!mapContainerRef.current}, mapRef=${!!mapRef.current}`)
        return
      }

      setDebugInfo(prev => prev + "\nマップを初期化しています...")

      // マップの中心位置を計算
      const center = getMapCenter()
      const zoom = getZoomLevel()

      // マップコンテナのスタイルを確認
      const containerStyle = window.getComputedStyle(mapContainerRef.current)
      setDebugInfo(prev => prev + `\nマップコンテナのスタイル: width=${containerStyle.width}, height=${containerStyle.height}`)

      // マップを初期化
      mapRef.current = window.L.map(mapContainerRef.current).setView(center, zoom)

      // タイルレイヤーを追加
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)

      setMapInitialized(true)
      setDebugInfo(prev => prev + "\nマップが初期化されました")

      // マーカーを追加
      updateCheckpointMarkers()
      updateTeamMarkers(teamLocations)

      // 現在位置を取得
      getCurrentLocation()
    } catch (err) {
      console.error("Error initializing map:", err)
      setError(`地図の初期化に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
      setDebugInfo(prev => prev + `\nマップ初期化エラー: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // チェックポイントのマーカーを更新
  const updateCheckpointMarkers = () => {
    if (!window.L || !mapRef.current) return

    try {
      // 既存のマーカーをクリア
      markersRef.current.forEach((marker) => {
        if (mapRef.current) marker.remove()
      })
      markersRef.current = []

      // チェックポイントのマーカーを追加
      checkpoints.forEach((checkpoint) => {
        const marker = window.L.marker([checkpoint.latitude, checkpoint.longitude])
          .addTo(mapRef.current)
          .bindPopup(`
            <div>
              <h3 style="font-weight: bold;">${checkpoint.name}</h3>
              <p>${checkpoint.description || ""}</p>
              <p>ポイント: ${checkpoint.point_value}</p>
            </div>
          `)

        markersRef.current.push(marker)
      })
    } catch (err) {
      console.error("Error updating checkpoint markers:", err)
      setDebugInfo(prev => prev + `\nチェックポイントマーカー更新エラー: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // チームの位置マーカーを更新
  const updateTeamMarkers = (locations: TeamLocation[]) => {
    if (!window.L || !mapRef.current) return

    try {
      locations.forEach((location) => {
        const team = teams.find((t) => t.id === location.team_id)
        if (!team) return

        // カスタムアイコンを作成
        const icon = window.L.divIcon({
          className: "custom-team-marker",
          html: `<div style="background-color: ${team.color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const marker = window.L.marker([location.latitude, location.longitude], { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${team.color};"></div>
                <h3 style="font-weight: bold; margin: 0;">${team.name}</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 12px;">最終更新: ${new Date(location.timestamp).toLocaleTimeString()}</p>
            </div>
          `)

        markersRef.current.push(marker)
      })
    } catch (err) {
      console.error("Error updating team markers:", err)
      setDebugInfo(prev => prev + `\nチームマーカー更新エラー: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

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

        setPosition([latitude, longitude])
        updateCurrentPositionMarker(latitude, longitude)

        // マップが初期化されていれば、現在位置に移動
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16)
        }

        setLocating(false)
      },
      (error) => {
        console.error("位置情報の取得に失敗しました:", error)
        alert("位置情報の取得に失敗しました。位置情報の許可を確認してください。")
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  // 現在位置のマーカーを更新
  const updateCurrentPositionMarker = (latitude: number, longitude: number) => {
    if (!window.L || !mapRef.current) return

    try {
      // 既存のマーカーを削除
      if (currentPositionMarkerRef.current) {
        currentPositionMarkerRef.current.remove()
      }

      // 現在位置のマーカーを作成
      const icon = window.L.divIcon({
        className: "current-position-marker",
        html: `
          <div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #4285F4;"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      currentPositionMarkerRef.current = window.L.marker([latitude, longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup("<div><strong>現在地</strong></div>")
    } catch (err) {
      console.error("Error updating current position marker:", err)
      setDebugInfo(prev => prev + `\n現在位置マーカー更新エラー: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // マップの中心位置を計算
  const getMapCenter = () => {
    if (position) return position

    if (checkpoints.length > 0) {
      const sumLat = checkpoints.reduce((sum, cp) => sum + cp.latitude, 0)
      const sumLng = checkpoints.reduce((sum, cp) => sum + cp.longitude, 0)
      return [sumLat / checkpoints.length, sumLng / checkpoints.length] as [number, number]
    }

    if (teamLocations.length > 0) {
      const latestLocation = teamLocations[0]
      return [latestLocation.latitude, latestLocation.longitude] as [number, number]
    }

    return [35.6895, 139.6917] as [number, number] // デフォルト：東京
  }

  // マップのズームレベルを決定
  const getZoomLevel = () => {
    if (position) return 16
    if (checkpoints.length <= 1) return 15
    return 14
  }

  // Leafletスクリプトの読み込み完了時の処理
  const handleLeafletLoad = () => {
    console.log("Leaflet script loaded")
    setLeafletLoaded(true)
    setDebugInfo("Leafletスクリプトが読み込まれました")
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

  return (
    <div className="space-y-4">
      {/* Leafletスクリプトとスタイルの読み込み */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin="anonymous"
      />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin="anonymous"
        onLoad={handleLeafletLoad}
        strategy="afterInteractive"
      />

      <Alert variant="default" className="rounded-xl border-2 border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>OpenStreetMapを使用しています</AlertTitle>
        <AlertDescription>
          <p>詳細な地図を表示しています。「現在地を表示」ボタンをクリックして、現在位置を表示できます。</p>
        </AlertDescription>
      </Alert>

      <div className="relative">
        <div className="h-[400px] rounded-xl overflow-hidden border-2 border-primary/20">
          {error ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center p-4">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="font-medium text-destructive">{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">
                  再読み込み
                </Button>
                <div className="mt-4 text-xs text-left bg-muted p-2 rounded max-h-32 overflow-auto">
                  <p className="font-mono whitespace-pre-wrap">{debugInfo}</p>
                </div>
              </div>
            </div>
          ) : (
            <div 
              id="map" 
              ref={mapContainerRef} 
              className="h-full w-full" 
              style={{ height: "100%", width: "100%" }}
            />
          )}
        </div>

        <Button
          className="absolute bottom-4 right-4 bg-white text-primary hover:bg-primary hover:text-white rounded-full shadow-md"
          onClick={getCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <Locate className="h-5 w-5" />
          )}
          <span className="ml-1">現在地を表示</span>
        </Button>
      </div>

      {!mapInitialized && leafletLoaded && (
        <Alert variant="warning" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>マップの初期化中</AlertTitle>
          <AlertDescription>
            <p>マップを初期化しています。しばらくお待ちください。</p>
            <div className="mt-2 text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
              <p className="font-mono whitespace-pre-wrap">{debugInfo}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

// グローバル型定義
declare global {
  interface Window {
    L: any
  }
}

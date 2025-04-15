"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Locate, MapPin, Users } from "lucide-react"
import { getCheckpoints, getTeamLocations, type Checkpoint, type Team, type TeamLocation } from "@/lib/supabase"

// BasicMapコンポーネントのpropsにonErrorを追加
interface BasicMapProps {
  teams: Team[]
  onError?: () => void
}

export default function BasicMap({ teams, onError }: BasicMapProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // マップとマーカーの参照を保持
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const checkpointMarkersRef = useRef<any[]>([])
  const teamMarkersRef = useRef<{ [key: number]: any }>({})
  const teamLabelsRef = useRef<{ [key: number]: any }>({})
  const currentPositionMarkerRef = useRef<any>(null)
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const leafletLoadAttemptsRef = useRef<number>(0)
  const mapUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // データの取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [checkpointsData, locationsData] = await Promise.all([getCheckpoints(), getTeamLocations()])
        setCheckpoints(checkpointsData)
        setTeamLocations(locationsData)
        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch map data:", err)
        setError("マップデータの取得に失敗しました")
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Leafletスクリプトとスタイルを読み込む
  useEffect(() => {
    const loadLeafletResources = async () => {
      try {
        // すでに読み込まれているか確認
        if (typeof window !== "undefined" && window.L) {
          console.log("Leaflet already loaded")
          setLeafletLoaded(true)
          setDebugInfo((prev) => prev + "\nLeaflet already loaded in window object")
          return
        }

        setDebugInfo((prev) => prev + "\nAttempting to load Leaflet resources...")
        leafletLoadAttemptsRef.current += 1

        // CSSを読み込む
        await new Promise<void>((resolve, reject) => {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          link.crossOrigin = ""
          link.onload = () => resolve()
          link.onerror = () => reject(new Error("Failed to load Leaflet CSS"))
          document.head.appendChild(link)
        })

        // JSを読み込む
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.crossOrigin = ""
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Leaflet JS"))
          document.head.appendChild(script)
        })

        console.log("Leaflet resources loaded successfully")
        setLeafletLoaded(true)
      } catch (err) {
        console.error("Failed to load Leaflet resources:", err)
        setDebugInfo(
          (prev) => prev + `\nFailed to load Leaflet resources: ${err instanceof Error ? err.message : String(err)}`,
        )
        setError("マップライブラリの読み込みに失敗しました")
        setLoading(false)
        if (onError) onError()
      }
    }

    loadLeafletResources()

    // タイムアウト処理 - 60秒に延長
    loadingTimerRef.current = setTimeout(() => {
      if (!leafletLoaded) {
        console.warn("Leaflet loading timeout")
        setDebugInfo((prev) => prev + "\nLeaflet loading timeout after 60 seconds")
        setError("マップライブラリの読み込みがタイムアウトしました。ページを再読み込みしてください。")
        setLoading(false)
        if (onError) onError()
      }
    }, 60000) // 60秒でタイムアウト（延長）

    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current)
      }
    }
  }, [onError])

  // Leafletが読み込まれたらマップを初期化
  useEffect(() => {
    if (!leafletLoaded || loading || mapInitialized || !mapContainerRef.current) return

    // マップの初期化を少し遅らせて、DOMが完全に準備できるようにする
    const initTimer = setTimeout(() => {
      initializeMap()
    }, 300)

    return () => clearTimeout(initTimer)
  }, [leafletLoaded, loading, mapInitialized, checkpoints, teamLocations])

  // 定期的にチームの位置情報を更新
  useEffect(() => {
    if (!mapInitialized) return

    const updateTeamPositions = async () => {
      try {
        const locationsData = await getTeamLocations()
        setTeamLocations(locationsData)
        updateTeamMarkers(locationsData)
      } catch (err) {
        console.error("Failed to update team locations:", err)
      }
    }

    // 初回実行
    updateTeamPositions()

    // 10秒ごとに更新
    const interval = setInterval(updateTeamPositions, 10000)

    return () => clearInterval(interval)
  }, [mapInitialized])

  // マップの定期的な更新とキープアライブ処理
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return

    // マップを定期的に更新して表示を維持する
    const keepMapAlive = () => {
      if (mapRef.current) {
        try {
          // マップのサイズを再計算して表示を更新
          mapRef.current.invalidateSize()

          // 現在の中心位置を少しだけ移動して再描画を促す
          const center = mapRef.current.getCenter()
          if (center) {
            const newLat = center.lat + 0.0000001
            const newLng = center.lng + 0.0000001
            mapRef.current.setView([newLat, newLng], mapRef.current.getZoom(), { animate: false })
            mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), { animate: false })
          }

          console.log("Map kept alive at:", new Date().toISOString())
        } catch (e) {
          console.error("Error in keepMapAlive:", e)
        }
      }
    }

    // 20秒ごとにマップを更新
    mapUpdateIntervalRef.current = setInterval(keepMapAlive, 20000)

    return () => {
      if (mapUpdateIntervalRef.current) {
        clearInterval(mapUpdateIntervalRef.current)
      }
    }
  }, [mapInitialized])

  // コンポーネントのアンマウント時にマップを破棄
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      // すべてのインターバルをクリア
      if (mapUpdateIntervalRef.current) {
        clearInterval(mapUpdateIntervalRef.current)
      }
    }
  }, [])

  // マップの初期化
  const initializeMap = () => {
    if (!window.L || !mapContainerRef.current || mapRef.current) return

    try {
      console.log("Initializing map...")
      setDebugInfo((prev) => prev + "\nInitializing map...")

      // マップの中心位置を計算
      const center = getMapCenter()
      const zoom = getZoomLevel()

      // マップを初期化
      mapRef.current = window.L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        renderer: window.L.canvas({ padding: 0.5 }),
        wheelDebounceTime: 100,
        tap: true,
        maxBoundsViscosity: 1.0,
        // タイムアウト設定を無効化
        zoomAnimationThreshold: 20,
        fadeAnimation: true,
        markerZoomAnimation: true,
        inertia: true,
      })

      setDebugInfo((prev) => prev + "\nMap object created")

      // タイルレイヤーを追加
      const mainTileLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 5,
        updateWhenIdle: true,
        keepBuffer: 4,
        errorTileUrl: "https://via.placeholder.com/256x256?text=No+Tile",
      }).addTo(mapRef.current)

      setDebugInfo((prev) => prev + "\nMain tile layer added")

      // バックアップタイルレイヤー
      const backupTileLayer = window.L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 5,
      })

      // メインレイヤーがエラーになった場合、バックアップに切り替え
      mainTileLayer.on("tileerror", (event: any) => {
        console.warn("Tile error, switching to backup layer", event)
        setDebugInfo((prev) => prev + "\nTile error, switching to backup layer")
        if (!mapRef.current.hasLayer(backupTileLayer)) {
          backupTileLayer.addTo(mapRef.current)
        }
      })

      // マップの読み込み完了イベント
      mapRef.current.on("load", () => {
        console.log("Map loaded successfully")
        setDebugInfo((prev) => prev + "\nMap loaded successfully")
      })

      // マップのエラーイベント
      mapRef.current.on("error", (e: any) => {
        console.error("Map error:", e)
        setDebugInfo((prev) => prev + `\nMap error: ${e}`)
      })

      // マップの表示を維持するためのイベントリスナー
      mapRef.current.on("moveend", () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize()
        }
      })

      setMapInitialized(true)
      console.log("Map initialized")
      setDebugInfo((prev) => prev + "\nMap initialized")

      // マーカーを追加
      updateCheckpointMarkers(checkpoints)
      updateTeamMarkers(teamLocations)

      // 現在位置を取得
      getCurrentLocation()
    } catch (err) {
      console.error("Error initializing map:", err)
      setDebugInfo((prev) => prev + `\nError initializing map: ${err instanceof Error ? err.message : String(err)}`)
      setError(`地図の初期化に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // チェックポイントのマーカーを更新
  const updateCheckpointMarkers = (checkpointsData: Checkpoint[]) => {
    if (!window.L || !mapRef.current) return

    try {
      // 既存のマーカーをクリア
      checkpointMarkersRef.current.forEach((marker) => marker.remove())
      checkpointMarkersRef.current = []

      // チェックポイントのマーカーを追加
      checkpointsData.forEach((checkpoint) => {
        try {
          // カスタムアイコンを作成
          const icon = window.L.divIcon({
            className: "checkpoint-marker",
            html: `<div style="background-color: #FF5252; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })

          const marker = window.L.marker([checkpoint.latitude, checkpoint.longitude], { icon })
            .addTo(mapRef.current)
            .bindPopup(`
              <div style="min-width: 150px;">
                <h3 style="font-weight: bold; margin-bottom: 5px;">${checkpoint.name}</h3>
                <p style="margin: 5px 0;">${checkpoint.description || ""}</p>
                <p style="margin: 5px 0; font-weight: bold;">ポイント: ${checkpoint.point_value}</p>
              </div>
            `)

          checkpointMarkersRef.current.push(marker)
        } catch (e) {
          console.error("Error adding checkpoint marker:", e)
        }
      })
    } catch (e) {
      console.error("Error in updateCheckpointMarkers:", e)
    }
  }

  // チームの位置マーカーを更新
  const updateTeamMarkers = (locations: TeamLocation[]) => {
    if (!window.L || !mapRef.current) return

    try {
      // 既存のチームラベルを削除
      Object.values(teamLabelsRef.current).forEach((label) => {
        if (label) label.remove()
      })
      teamLabelsRef.current = {}

      // 各チームの位置を更新
      locations.forEach((location) => {
        const team = teams.find((t) => t.id === location.team_id)
        if (!team) return

        try {
          // 既存のマーカーがあれば位置を更新、なければ新規作成
          if (teamMarkersRef.current[team.id]) {
            teamMarkersRef.current[team.id].setLatLng([location.latitude, location.longitude])
          } else {
            // カスタムアイコンを作成
            const icon = window.L.divIcon({
              className: "team-marker",
              html: `<div style="background-color: ${team.color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            })

            const marker = window.L.marker([location.latitude, location.longitude], { icon })
              .addTo(mapRef.current)
              .bindPopup(`
                <div style="min-width: 150px;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${team.color};"></div>
                    <h3 style="font-weight: bold; margin: 0;">${team.name}</h3>
                  </div>
                  <p style="margin: 5px 0; font-size: 12px;">最終更新: ${new Date(location.timestamp).toLocaleTimeString()}</p>
                </div>
              `)

            teamMarkersRef.current[team.id] = marker
          }

          // チーム名を表示するラベルを作成
          const label = window.L.marker([location.latitude, location.longitude], {
            icon: window.L.divIcon({
              className: "team-label",
              html: `
                <div style="
                  background-color: ${team.color}; 
                  color: white; 
                  padding: 2px 6px; 
                  border-radius: 10px; 
                  font-size: 12px; 
                  font-weight: bold;
                  white-space: nowrap;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  transform: translateY(-22px);
                  text-shadow: 0px 0px 2px rgba(0,0,0,0.5);
                ">
                  ${team.name}
                </div>
              `,
              iconSize: [100, 20],
              iconAnchor: [50, 0],
            }),
            interactive: false, // ラベルはクリックできないように
            zIndexOffset: 1000, // 他のマーカーより前面に表示
          }).addTo(mapRef.current)

          teamLabelsRef.current[team.id] = label
        } catch (e) {
          console.error("Error updating team marker:", e)
        }
      })
    } catch (e) {
      console.error("Error in updateTeamMarkers:", e)
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

        // 現在位置のマーカーを更新
        if (window.L && mapRef.current) {
          updateCurrentPositionMarker(latitude, longitude)

          // マップを現在位置に移動（アニメーションを短く設定）
          mapRef.current.flyTo([latitude, longitude], 16, {
            animate: true,
            duration: 0.5, // アニメーション時間を短く
          })
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

    // 既存のマーカーを削除
    if (currentPositionMarkerRef.current) {
      currentPositionMarkerRef.current.remove()
    }

    try {
      // 現在位置のマーカーを作成
      const icon = window.L.divIcon({
        className: "current-position-marker",
        html: `
          <div style="
            background-color: #4285F4; 
            width: 16px; 
            height: 16px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 0 0 2px #4285F4, 0 0 5px rgba(0,0,0,0.5);
          "></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      currentPositionMarkerRef.current = window.L.marker([latitude, longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup("<div><strong>現在地</strong></div>")

      // 精度を示す円を追加
      window.L.circle([latitude, longitude], {
        radius: 30, // 半径（メートル）
        color: "#4285F4",
        fillColor: "#4285F4",
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current)
    } catch (e) {
      console.error("Error updating current position marker:", e)
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

  // 距離を計算する関数
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // 地球の半径 (m)
    const φ1 = (lat1 * Math.PI) / 180 // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const d = R * c
    return d
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm">マップを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* アラート部分の修正（マップ画面上部の通知） */}
      <Alert
        variant="default"
        className="rounded-xl border-2 border-primary/20 bg-white/80 backdrop-blur-sm shadow-sm mb-4"
      >
        <AlertCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="font-medium">OpenStreetMapを使用しています</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <p>「現在地を表示」ボタンをクリックして、現在位置を表示できます。</p>
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
              ref={mapContainerRef}
              className="h-full w-full"
              style={{ backgroundColor: "#f0f0f0" }}
              id="map-container"
            />
          )}
        </div>

        {/* 現在位置表示ボタンの修正 */}
        <Button
          className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm text-primary hover:bg-primary hover:text-white rounded-full shadow-md hover:shadow-glow flex items-center gap-2 z-20 border border-white/50"
          onClick={getCurrentLocation}
          disabled={locating || !mapInitialized}
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

      {/* チェックポイントとチーム情報カードの修正 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* チェックポイント一覧 */}
        <div className="glass-panel p-4 shadow-sm slide-in delay-100">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-primary text-lg">チェックポイント一覧</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">全{checkpoints.length}箇所</p>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            <ul className="space-y-2">
              {checkpoints.map((checkpoint) => (
                <li
                  key={checkpoint.id}
                  className="p-3 bg-muted/50 backdrop-blur-sm rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <p className="font-medium">{checkpoint.name}</p>
                  <p className="text-xs text-muted-foreground">
                    位置: {checkpoint.latitude.toFixed(6)}, {checkpoint.longitude.toFixed(6)}
                  </p>
                  {position && (
                    <p className="text-xs text-primary font-medium mt-1">
                      距離:{" "}
                      {calculateDistance(position[0], position[1], checkpoint.latitude, checkpoint.longitude) < 1000
                        ? `${calculateDistance(position[0], position[1], checkpoint.latitude, checkpoint.longitude).toFixed(0)}m`
                        : `${(calculateDistance(position[0], position[1], checkpoint.latitude, checkpoint.longitude) / 1000).toFixed(2)}km`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* チーム位置情報 */}
        <div className="glass-panel p-4 shadow-sm slide-in delay-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-primary text-lg">チーム位置情報</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">全{teamLocations.length}チーム</p>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            <ul className="space-y-2">
              {teamLocations.map((location) => {
                const team = teams.find((t) => t.id === location.team_id)
                if (!team) return null

                return (
                  <li
                    key={location.id}
                    className="p-3 bg-muted/50 backdrop-blur-sm rounded-lg hover:bg-muted/70 transition-colors flex items-center gap-3"
                  >
                    <div
                      className="min-w-[2rem] h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${team.color}20` }}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{team.name}</p>
                      <div className="flex flex-wrap gap-x-6 text-xs text-muted-foreground">
                        <p>
                          位置: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </p>
                        <p>最終更新: {new Date(location.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* デバッグ情報 - 開発中のみ表示 */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-muted rounded-md">
          <details>
            <summary className="cursor-pointer font-medium">デバッグ情報</summary>
            <div className="mt-2 text-xs bg-muted-foreground/10 p-2 rounded max-h-40 overflow-auto">
              <p className="font-mono whitespace-pre-wrap">{debugInfo}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

// グローバル型定義
declare global {
  interface Window {
    L: any
  }
}

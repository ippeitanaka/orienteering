"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import CountdownTimer from "@/components/countdown-timer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCheckpoints, getTeamCheckins, getTeams, type Checkpoint, type Team, type TeamLocation } from "@/lib/supabase"
import { ensureCheckpointMarkerStyles, getCheckpointMarkerIconConfig } from "@/lib/checkpoint-marker"
import { getContrastColor } from "@/lib/utils"
import { AlertCircle, LocateFixed, MapPinned, RefreshCw, Route, Trophy, Users } from "lucide-react"

interface TeamRealtimeItem {
  team: Team
  location: TeamLocation | null
  progress: number
}

const LEAFLET_CSS_ID = "staff-realtime-leaflet-css"
const LEAFLET_SCRIPT_ID = "staff-realtime-leaflet-script"

const formatTimeAgo = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    return "未取得"
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (diffSeconds < 60) {
    return `${diffSeconds}秒前`
  }

  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) {
    return `${minutes}分前`
  }

  const hours = Math.floor(minutes / 60)
  return `${hours}時間前`
}

const loadLeaflet = async () => {
  if (typeof window === "undefined") {
    return
  }

  if ((window as any).L) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existingCss = document.getElementById(LEAFLET_CSS_ID) as HTMLLinkElement | null
    if (!existingCss) {
      const link = document.createElement("link")
      link.id = LEAFLET_CSS_ID
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.onload = () => resolve()
      link.onerror = () => reject(new Error("Failed to load Leaflet CSS"))
      document.head.appendChild(link)
    } else {
      resolve()
    }
  })

  if ((window as any).L) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet script")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = LEAFLET_SCRIPT_ID
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Leaflet script"))
    document.body.appendChild(script)
  })
}

export default function RealtimeMonitor() {
  const [teams, setTeams] = useState<Team[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [progressByTeam, setProgressByTeam] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [leafletReady, setLeafletReady] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const teamMarkersRef = useRef<Record<number, any>>({})
  const teamLabelsRef = useRef<Record<number, any>>({})
  const checkpointMarkersRef = useRef<Record<number, any>>({})
  const initialBoundsAppliedRef = useRef(false)

  const fetchLatestTeamLocations = async (): Promise<TeamLocation[]> => {
    const response = await fetch("/api/team-locations", { cache: "no-store" })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "チーム位置情報の取得に失敗しました")
    }

    return result.data || []
  }

  const fetchRealtimeData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const [teamsData, checkpointsData, locationsData] = await Promise.all([
        getTeams(),
        getCheckpoints({ activeOnly: true }),
        fetchLatestTeamLocations(),
      ])

      const activeCheckpointIds = new Set(checkpointsData.map((checkpoint) => checkpoint.id))
      const progressEntries = await Promise.all(
        teamsData.map(async (team) => {
          const checkins = await getTeamCheckins(team.id)
          const activeCheckins = checkins.filter((checkin) => activeCheckpointIds.has(checkin.checkpoint_id)).length
          return [team.id, activeCheckins] as const
        }),
      )

      setTeams(teamsData)
      setCheckpoints(checkpointsData)
      setTeamLocations(locationsData)
      setProgressByTeam(Object.fromEntries(progressEntries))
      setLastUpdatedAt(new Date().toLocaleTimeString())
      setError(null)
    } catch (fetchError) {
      console.error("Failed to fetch realtime monitor data:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "リアルタイム情報の取得に失敗しました")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchRealtimeData(true)

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return
      }

      void fetchRealtimeData()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false

    const initializeLeaflet = async () => {
      try {
        await loadLeaflet()
        ensureCheckpointMarkerStyles()

        if (!cancelled) {
          setLeafletReady(true)
        }
      } catch (leafletError) {
        console.error("Failed to initialize realtime Leaflet:", leafletError)
        if (!cancelled) {
          setError("地図ライブラリの読み込みに失敗しました")
        }
      }
    }

    void initializeLeaflet()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current || !(window as any).L) {
      return
    }

    const L = (window as any).L
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: true,
      preferCanvas: true,
    }).setView([35.7225, 139.7753], 15)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [leafletReady])

  useEffect(() => {
    if (!mapRef.current || !(window as any).L) {
      return
    }

    const L = (window as any).L

    Object.values(checkpointMarkersRef.current).forEach((marker) => marker.remove())
    checkpointMarkersRef.current = {}

    checkpoints.forEach((checkpoint) => {
      const icon = L.divIcon(getCheckpointMarkerIconConfig(checkpoint))
      const marker = L.marker([checkpoint.latitude, checkpoint.longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="min-width: 180px;">
            <h3 style="font-weight: bold; margin-bottom: 6px;">${checkpoint.name}</h3>
            <p style="margin: 0 0 6px 0; font-size: 12px;">${checkpoint.description || "説明なし"}</p>
            <p style="margin: 0; font-size: 12px; color: #475569;">${checkpoint.is_moving ? "移動チェックポイント" : "固定チェックポイント"}</p>
          </div>
        `)

      checkpointMarkersRef.current[checkpoint.id] = marker
    })

    Object.values(teamMarkersRef.current).forEach((marker) => marker.remove())
    Object.values(teamLabelsRef.current).forEach((marker) => marker.remove())
    teamMarkersRef.current = {}
    teamLabelsRef.current = {}

    teamLocations.forEach((location) => {
      const team = teams.find((item) => item.id === location.team_id)
      if (!team) {
        return
      }

      const icon = L.divIcon({
        className: "staff-realtime-team-marker",
        html: `
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 999px;
            background: ${team.color};
            border: 3px solid white;
            box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(15, 23, 42, 0.25);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker([location.latitude, location.longitude], { icon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="min-width: 180px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="width:12px;height:12px;border-radius:999px;background:${team.color};"></div>
              <strong>${team.name}</strong>
            </div>
            <p style="margin:0 0 4px 0;font-size:12px;">スコア: ${team.total_score} 点</p>
            <p style="margin:0;font-size:12px;">最終更新: ${new Date(location.timestamp).toLocaleTimeString()}</p>
          </div>
        `)

      const label = L.marker([location.latitude, location.longitude], {
        icon: L.divIcon({
          className: "staff-realtime-team-label",
          html: `
            <div style="
              transform: translateY(-18px);
              background: rgba(15, 23, 42, 0.82);
              color: white;
              border-radius: 999px;
              padding: 2px 8px;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.5);
              box-shadow: 0 4px 12px rgba(15,23,42,0.18);
            ">${team.name}</div>
          `,
          iconSize: [96, 20],
          iconAnchor: [48, 0],
        }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(mapRef.current)

      teamMarkersRef.current[team.id] = marker
      teamLabelsRef.current[team.id] = label
    })

    if (!initialBoundsAppliedRef.current) {
      const points = [
        ...checkpoints.map((checkpoint) => [checkpoint.latitude, checkpoint.longitude] as [number, number]),
        ...teamLocations.map((location) => [location.latitude, location.longitude] as [number, number]),
      ]

      if (points.length > 0) {
        mapRef.current.fitBounds(points, { padding: [48, 48] })
        initialBoundsAppliedRef.current = true
      }
    }
  }, [checkpoints, teamLocations, teams])

  const movingCheckpoints = useMemo(() => checkpoints.filter((checkpoint) => checkpoint.is_moving), [checkpoints])

  const teamItems = useMemo<TeamRealtimeItem[]>(() => {
    return teams.map((team) => ({
      team,
      location: teamLocations.find((location) => location.team_id === team.id) || null,
      progress: progressByTeam[team.id] || 0,
    }))
  }, [teams, teamLocations, progressByTeam])

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/90 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">リアルタイム監視</h2>
          <p className="text-sm text-muted-foreground">チーム位置、移動チェックポイント、得点、残り時間を 1 画面で確認できます。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            {teamLocations.length}/{teams.length} チーム位置取得
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Route className="h-3.5 w-3.5" />
            移動 {movingCheckpoints.length} 箇所
          </Badge>
          <Badge variant="outline" className="gap-1">
            <LocateFixed className="h-3.5 w-3.5" />
            最終更新 {lastUpdatedAt || "--:--:--"}
          </Badge>
          <Button variant="outline" size="sm" className="min-h-10" onClick={() => void fetchRealtimeData()} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border bg-slate-950 shadow-2xl">
        <div ref={mapContainerRef} className="h-[70vh] min-h-[560px] w-full bg-slate-900" />

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm text-white">
              <RefreshCw className="h-4 w-4 animate-spin" />
              データを読み込んでいます...
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 p-3 lg:p-5">
          <div className="grid h-full gap-3 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
            <div className="pointer-events-auto flex flex-col gap-3 self-start">
              <Card className="border-white/15 bg-slate-950/82 text-white backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPinned className="h-4 w-4" />
                    ゲーム状況
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <CountdownTimer isStaff={true} />
                </CardContent>
              </Card>

              <Card className="border-white/15 bg-slate-950/82 text-white backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Route className="h-4 w-4" />
                    移動チェックポイント
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {movingCheckpoints.length === 0 ? <p className="text-white/70">現在はありません</p> : null}
                  {movingCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{checkpoint.name}</p>
                          <p className="text-xs text-white/70">担当: {checkpoint.assigned_staff_name || "未設定"}</p>
                        </div>
                        <Badge className="bg-blue-500/90 text-white hover:bg-blue-500/90">#{checkpoint.id}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-white/70">更新: {formatTimeAgo(checkpoint.last_location_update)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div />

            <div className="pointer-events-auto flex h-full flex-col justify-end gap-3 lg:justify-start">
              <Card className="max-h-[calc(70vh-2.5rem)] overflow-hidden border-white/15 bg-slate-950/82 text-white backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4" />
                    チーム状況
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[calc(70vh-8rem)] space-y-2 overflow-y-auto">
                  {teamItems.map(({ team, location, progress }) => (
                    <div key={team.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                            <p className="truncate font-semibold">{team.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-white/70">進捗: {progress}/{checkpoints.length}</p>
                        </div>
                        <div
                          className="rounded-full px-3 py-1 text-xs font-bold"
                          style={{ backgroundColor: team.color, color: getContrastColor(team.color) }}
                        >
                          {team.total_score}点
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-white/70">
                        {location
                          ? `位置: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} / ${formatTimeAgo(location.timestamp)}`
                          : "位置情報はまだ取得されていません"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
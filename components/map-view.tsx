"use client"

import { useState, useEffect } from "react"
import { getCheckpoints, getTeamLocations, type Checkpoint, type Team, type TeamLocation } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import DebugMaps from "./debug-maps"

interface MapViewProps {
  teams: Team[]
}

export default function MapView({ teams }: MapViewProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [teamLocations, setTeamLocations] = useState<TeamLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

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
      <Alert variant="warning" className="rounded-xl border-2 border-yellow-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>マップ表示について</AlertTitle>
        <AlertDescription>
          <p>マップが表示されない場合は、Google Maps APIの設定を確認してください。</p>
          <button onClick={() => setShowDebug(!showDebug)} className="text-primary underline text-sm mt-1">
            {showDebug ? "デバッグ情報を隠す" : "デバッグ情報を表示"}
          </button>
        </AlertDescription>
      </Alert>

      {showDebug && <DebugMaps />}

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

"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getCheckpoints, getTeams, type Checkpoint, type Team } from "@/lib/supabase"
import TeamSelector from "@/components/team-selector"
import TeamHomeButton from "@/components/team-home-button"
import LocationTracker from "@/components/location-tracker"
import { Crosshair, HelpCircle, Map, MapPin, Sparkles, Trophy, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Scoreboard from "@/components/scoreboard"
import dynamic from "next/dynamic"
import SimpleFallbackMap from "@/components/simple-fallback-map"
import CountdownTimer from "@/components/countdown-timer"
import ThemeToggle from "@/components/theme-toggle"
import { calculateDistanceMeters, formatDistance } from "@/lib/utils"

// BasicMapをクライアントサイドのみで読み込む
const BasicMap = dynamic(() => import("@/components/basic-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm">マップを読み込み中...</p>
      </div>
    </div>
  ),
})

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [activeTab, setActiveTab] = useState("map")
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLoadFailed, setMapLoadFailed] = useState(false)
  const [mapLoadAttempts, setMapLoadAttempts] = useState(0)
  const [mapKey, setMapKey] = useState(0) // マップの強制再レンダリング用のキー
  const [mapLoadTimeout, setMapLoadTimeout] = useState<NodeJS.Timeout | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [activeArrivalCheckpoint, setActiveArrivalCheckpoint] = useState<Checkpoint | null>(null)
  const arrivalTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const celebratedCheckpointIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    // クライアントサイドでのみ実行されるコードをここに記述
    setIsMounted(true)

    async function fetchData() {
      try {
        const [teamsData, checkpointData] = await Promise.all([getTeams(), getCheckpoints({ activeOnly: true })])
        setTeams(teamsData)
        setCheckpoints(checkpointData)

        // ローカルストレージから選択済みのチームを復元
        if (typeof window !== "undefined") {
          const savedTeamId = localStorage.getItem("teamId")
          if (savedTeamId) {
            const team = teamsData.find((t) => t.id.toString() === savedTeamId)
            if (team) {
              setSelectedTeam(team)
            }
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch teams:", err)
        setError("チーム情報の取得に失敗しました")
        setLoading(false)
      }
    }

    if (isMounted) {
      fetchData()
    }

    return () => {
      // タイムアウトをクリア
      if (mapLoadTimeout) {
        clearTimeout(mapLoadTimeout)
      }
    }
  }, [isMounted, mapLoadTimeout])

  useEffect(() => {
    if (!selectedTeam) {
      celebratedCheckpointIdsRef.current.clear()
      setActiveArrivalCheckpoint(null)
    }
  }, [selectedTeam])

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    if (typeof window !== "undefined") {
      localStorage.setItem("teamId", team.id.toString())
    }
  }

  const handleMapLoadError = () => {
    console.log("Map load failed")

    // 既存のタイムアウトをクリア
    if (mapLoadTimeout) {
      clearTimeout(mapLoadTimeout)
    }

    // マップ読み込み失敗から5分後に自動的にリセットするタイマーを設定
    const timeout = setTimeout(() => {
      console.log("Auto resetting map load failure state")
      setMapLoadFailed(false)
      setMapLoadAttempts((prev) => prev + 1)
      setMapKey((prev) => prev + 1)
    }, 300000) // 5分 = 300000ミリ秒

    setMapLoadTimeout(timeout)
    setMapLoadFailed(true)
  }

  const handleRetryMapLoad = () => {
    // 既存のタイムアウトをクリア
    if (mapLoadTimeout) {
      clearTimeout(mapLoadTimeout)
      setMapLoadTimeout(null)
    }

    setMapLoadFailed(false)
    setMapLoadAttempts((prev) => prev + 1)
    setMapKey((prev) => prev + 1)
  }

  // 位置情報が更新されたときにマップを更新
  const handleLocationUpdate = () => {
    // マップを強制的に再レンダリング
    setMapKey((prev) => prev + 1)
  }

  const handlePositionChange = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    if (!checkpoints.length) {
      return
    }

    let nearestCheckpoint: Checkpoint | null = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const checkpoint of checkpoints) {
      const distance = calculateDistanceMeters(latitude, longitude, checkpoint.latitude, checkpoint.longitude)
      if (distance < nearestDistance) {
        nearestCheckpoint = checkpoint
        nearestDistance = distance
      }
    }

    if (!nearestCheckpoint || nearestDistance > 40 || celebratedCheckpointIdsRef.current.has(nearestCheckpoint.id)) {
      return
    }

    celebratedCheckpointIdsRef.current.add(nearestCheckpoint.id)
    setActiveArrivalCheckpoint(nearestCheckpoint)

    if (arrivalTimeoutRef.current) {
      clearTimeout(arrivalTimeoutRef.current)
    }

    arrivalTimeoutRef.current = setTimeout(() => {
      setActiveArrivalCheckpoint(null)
    }, 6000)
  }

  // サーバーサイドレンダリング時は最小限の内容を表示
  if (!isMounted) {
    return (
      <div className="elt-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-4 text-lg font-heading">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="elt-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-pulse-slow">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-4 text-lg font-heading">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="elt-bg min-h-screen flex items-center justify-center">
        <Card className="elt-card max-w-md border-destructive/30">
          <CardHeader>
            <CardTitle className="text-center text-destructive font-heading">エラーが発生しました</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()} className="elt-button">
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ダッシュボードのヘッダー部分
  return (
    <div className="elt-bg min-h-screen">
      <header className="elt-header py-3 sm:py-4 shadow-sm relative overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/images/elt-logo.png" alt="ELT 27周年記念ロゴ" width={80} height={48} className="elt-logo h-auto w-14 sm:w-20" />
            <h1 className="text-lg sm:text-xl font-bold font-heading leading-tight">学外オリエンテーション</h1>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <ThemeToggle
              variant="ghost"
              className="h-10 px-3 text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
            />
            <Link href="/help/maps-api">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 min-w-10 text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">ヘルプ</span>
              </Button>
            </Link>
            <TeamHomeButton
              variant="ghost"
              className="h-10 min-w-10 text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
              label="ホーム"
            />
          </div>
        </div>
      </header>

      <main className="elt-container page-transition">
        {!selectedTeam ? (
          <Card className="elt-card max-w-md mx-auto shadow-elt-sharp slide-in">
            <CardHeader>
              <CardTitle className="text-center font-heading text-xl sm:text-2xl">チームログイン</CardTitle>
              <CardDescription className="text-center text-base sm:text-lg mt-2 leading-relaxed">
                スタッフから提供されたチームコードを入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamSelector teams={teams} onSelect={handleTeamSelect} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-md shadow-elt-sharp slide-in sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm shadow-sm border border-border/50 shrink-0"
                  style={{ backgroundColor: selectedTeam.color }}
                ></div>
                <h2 className="text-lg sm:text-xl font-heading leading-tight break-words">{selectedTeam.name}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm border-border/50 hover:bg-accent flex items-center justify-center gap-2 w-full sm:w-auto min-h-11"
                onClick={() => {
                  setSelectedTeam(null)
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("teamId")
                  }
                }}
              >
                <Users className="h-4 w-4" />
                チーム変更
              </Button>
            </div>

            {/* カウントダウンタイマーを追加 */}
            <div className="slide-in delay-50">
              <CountdownTimer />
            </div>

            <Card className="elt-card shadow-elt-sharp slide-in delay-100">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid h-auto grid-cols-2 gap-2 p-2 bg-muted/40 mx-2 mt-2 rounded-sm">
                  <TabsTrigger value="map" className="elt-nav-item flex items-center justify-center gap-2 min-h-11 px-3 py-3 text-sm sm:text-base">
                    <Map className="h-5 w-5" />
                    マップ
                  </TabsTrigger>
                  <TabsTrigger value="score" className="elt-nav-item flex items-center justify-center gap-2 min-h-11 px-3 py-3 text-sm sm:text-base">
                    <Trophy className="h-5 w-5" />
                    スコア
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="p-3 sm:p-4 slide-in">
                  <div className="relative">
                    {activeArrivalCheckpoint ? (
                      <Alert className="mb-4 border-emerald-300 bg-gradient-to-r from-emerald-100 via-lime-50 to-emerald-100 text-emerald-950 shadow-xl animate-checkpoint-burst">
                        <Sparkles className="h-5 w-5" />
                        <AlertTitle className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                          チェックポイント到達圏内
                          {activeArrivalCheckpoint.is_moving ? (
                            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">移動中</span>
                          ) : null}
                        </AlertTitle>
                        <AlertDescription>
                          <div className="flex flex-wrap items-center gap-2">
                            <Crosshair className="h-4 w-4" />
                            <span className="font-semibold">{activeArrivalCheckpoint.name}</span>
                            <span className="text-sm text-emerald-800">+{activeArrivalCheckpoint.point_value}pt</span>
                          </div>
                          <p className="mt-1 text-sm">
                            {activeArrivalCheckpoint.assigned_staff_name
                              ? `${activeArrivalCheckpoint.assigned_staff_name} が移動中のチェックポイントです。`
                              : "チェックポイントの近くまで来ています。"}
                            <span className="ml-1">いまの位置から狙ってください。</span>
                          </p>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {mapLoadFailed ? (
                      <SimpleFallbackMap teams={teams} onRetry={handleRetryMapLoad} />
                    ) : (
                      <BasicMap
                        key={`map-attempt-${mapLoadAttempts}-update-${mapKey}`}
                        teams={teams}
                        onError={handleMapLoadError}
                      />
                    )}
                    <div className="mt-4">
                      <LocationTracker onLocationUpdate={handleLocationUpdate} onPositionChange={handlePositionChange} />
                    </div>
                    {activeArrivalCheckpoint ? (
                      <div className="mt-3 rounded-lg bg-emerald-950/90 px-4 py-3 text-sm text-emerald-50 shadow-lg">
                        {activeArrivalCheckpoint.name} まであと最大 {formatDistance(40)} 圏内です。スタッフチェックインの準備をしてください。
                      </div>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="score" className="p-3 sm:p-4 slide-in">
                  <Scoreboard variant="team" selectedTeamId={selectedTeam?.id ?? null} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </main>

      <footer className="elt-footer text-center mt-8">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
        </div>
      </footer>
    </div>
  )
}

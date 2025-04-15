"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getTeams, type Team } from "@/lib/supabase"
import TeamSelector from "@/components/team-selector"
import LocationTracker from "@/components/location-tracker"
import QRScanner from "@/components/qr-scanner"
import { MapPin, QrCode, Map, Trophy, Home, HelpCircle, Compass, Flag, Users } from "lucide-react"
import Link from "next/link"
import Scoreboard from "@/components/scoreboard"
import dynamic from "next/dynamic"
import SimpleFallbackMap from "@/components/simple-fallback-map"

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

  useEffect(() => {
    // クライアントサイドでのみ実行されるコードをここに記述
    setIsMounted(true)

    async function fetchData() {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData)

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
  }, [isMounted])

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    if (typeof window !== "undefined") {
      localStorage.setItem("teamId", team.id.toString())
    }
  }

  const handleMapLoadError = () => {
    console.log("Map load failed")
    setMapLoadFailed(true)
  }

  const handleRetryMapLoad = () => {
    setMapLoadFailed(false)
    setMapLoadAttempts((prev) => prev + 1)
  }

  // サーバーサイドレンダリング時は最小限の内容を表示
  if (!isMounted) {
    return (
      <div className="min-h-screen cute-bg flex items-center justify-center">
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
      <div className="min-h-screen cute-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-bounce-slow">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-4 text-lg font-heading">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen cute-bg flex items-center justify-center">
        <Card className="cute-card max-w-md border-destructive/30">
          <CardHeader>
            <CardTitle className="text-center text-destructive font-heading">エラーが発生しました</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()} className="cute-button">
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ダッシュボードのヘッダー部分
  return (
    <div className="min-h-screen cute-bg">
      <header className="bg-primary/90 text-primary-foreground py-6 shadow-md relative overflow-hidden">
        <div className="container mx-auto px-4 flex justify-between items-center relative z-10">
          <h1 className="text-2xl font-bold font-heading">オリエンテーリング</h1>
          <div className="flex items-center gap-3">
            <Link href="/help/maps-api">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">ヘルプ</span>
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              >
                <Home className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">ホーム</span>
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
          <div className="absolute top-1/4 left-10 animate-float">
            <Compass className="w-12 h-12" />
          </div>
          <div className="absolute bottom-1/4 right-10 animate-pulse-soft">
            <Flag className="w-10 h-10" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 page-transition">
        {!selectedTeam ? (
          <Card className="glass-panel max-w-md mx-auto border-primary/30 shadow-lg slide-in">
            <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
            <CardHeader>
              <CardTitle className="text-center text-primary font-heading text-2xl">チームを選択</CardTitle>
              <CardDescription className="text-center text-lg mt-2">参加するチームを選んでください</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamSelector teams={teams} onSelect={handleTeamSelect} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-sm slide-in">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full shadow-inner"
                  style={{ backgroundColor: selectedTeam.color }}
                ></div>
                <h2 className="text-xl font-heading">{selectedTeam.name}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/30 hover:bg-primary/10 flex items-center gap-2"
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

            <Card className="glass-panel border-primary/30 overflow-hidden shadow-lg slide-in delay-100">
              <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 gap-3 p-3 bg-muted/40 mx-3 mt-3 rounded-xl">
                  <TabsTrigger
                    value="map"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl flex items-center gap-2 h-12"
                  >
                    <Map className="h-5 w-5" />
                    マップ
                  </TabsTrigger>
                  <TabsTrigger
                    value="qr"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl flex items-center gap-2 h-12"
                  >
                    <QrCode className="h-5 w-5" />
                    QRスキャン
                  </TabsTrigger>
                  <TabsTrigger
                    value="score"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl flex items-center gap-2 h-12"
                  >
                    <Trophy className="h-5 w-5" />
                    スコア
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="p-4 slide-in">
                  <div className="relative">
                    {mapLoadFailed ? (
                      <SimpleFallbackMap teams={teams} onRetry={handleRetryMapLoad} />
                    ) : (
                      <BasicMap key={`map-attempt-${mapLoadAttempts}`} teams={teams} onError={handleMapLoadError} />
                    )}
                    <div className="mt-4">
                      <LocationTracker />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="qr" className="p-4 slide-in">
                  <QRScanner />
                </TabsContent>

                <TabsContent value="score" className="p-4 slide-in">
                  <Scoreboard />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </main>

      <footer className="bg-muted py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} ELT学外オリエンテーション</p>
        </div>
      </footer>
    </div>
  )
}

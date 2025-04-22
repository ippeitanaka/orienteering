"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getTeams, type Team } from "@/lib/supabase"
import TeamSelector from "@/components/team-selector"
import LocationTracker from "@/components/location-tracker"
import { Map, Trophy, Home, HelpCircle, Users, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Scoreboard from "@/components/scoreboard"
import dynamic from "next/dynamic"
import SimpleFallbackMap from "@/components/simple-fallback-map"
import CountdownTimer from "@/components/countdown-timer"

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

    return () => {
      // タイムアウトをクリア
      if (mapLoadTimeout) {
        clearTimeout(mapLoadTimeout)
      }
    }
  }, [isMounted, mapLoadTimeout])

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
      <header className="elt-header py-4 shadow-sm relative overflow-hidden">
        <div className="container mx-auto px-4 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/images/elt-logo.png" alt="ELT 26周年記念ロゴ" width={80} height={48} className="elt-logo" />
            <h1 className="text-xl font-bold font-heading">学外オリエンテーション</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/help/maps-api">
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">ヘルプ</span>
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm"
              >
                <Home className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">ホーム</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="elt-container page-transition">
        {!selectedTeam ? (
          <Card className="elt-card max-w-md mx-auto shadow-elt-sharp slide-in">
            <CardHeader>
              <CardTitle className="text-center font-heading text-2xl">チームログイン</CardTitle>
              <CardDescription className="text-center text-lg mt-2">
                スタッフから提供されたチームコードを入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamSelector teams={teams} onSelect={handleTeamSelect} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-card p-4 rounded-md shadow-elt-sharp slide-in">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-sm shadow-sm border border-border/50"
                  style={{ backgroundColor: selectedTeam.color }}
                ></div>
                <h2 className="text-xl font-heading">{selectedTeam.name}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm border-border/50 hover:bg-accent flex items-center gap-2"
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
                <TabsList className="grid grid-cols-2 gap-2 p-2 bg-muted/40 mx-2 mt-2 rounded-sm">
                  <TabsTrigger value="map" className="elt-nav-item flex items-center gap-2 h-12">
                    <Map className="h-5 w-5" />
                    マップ
                  </TabsTrigger>
                  <TabsTrigger value="score" className="elt-nav-item flex items-center gap-2 h-12">
                    <Trophy className="h-5 w-5" />
                    スコア
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="p-4 slide-in">
                  <div className="relative">
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
                      <LocationTracker onLocationUpdate={handleLocationUpdate} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="score" className="p-4 slide-in">
                  <Scoreboard />
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

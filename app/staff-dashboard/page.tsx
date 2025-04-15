"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Home, LogOut, MapPin, Users, Award, QrCode } from "lucide-react"
import { isSupabaseConfigured, getCheckpoints, type Team, type Checkpoint, type Staff } from "@/lib/supabase"
import CheckpointForm from "@/components/staff/checkpoint-form"
import TeamForm from "@/components/staff/team-form"
import QRCodeDisplay from "@/components/staff/qr-code-display"
import CheckinForm from "@/components/staff/checkin-form"
import Scoreboard from "@/components/scoreboard"

export default function StaffDashboard() {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("checkin")
  const [showQRCode, setShowQRCode] = useState(false)
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [configError, setConfigError] = useState(false)
  const router = useRouter()

  // チーム一覧を再読み込みする関数
  const refreshTeams = async () => {
    try {
      const response = await fetch("/api/teams")
      if (!response.ok) {
        throw new Error("Failed to fetch teams")
      }
      const result = await response.json()
      setTeams(result.data || [])
    } catch (err) {
      console.error("Failed to refresh teams:", err)
    }
  }

  useEffect(() => {
    const staffId = localStorage.getItem("staffId")
    if (!staffId) {
      router.push("/staff-login")
      return
    }

    // Supabaseが設定されているか確認
    const supabaseConfigured = isSupabaseConfigured()
    setConfigError(!supabaseConfigured)

    async function fetchData() {
      try {
        // スタッフ情報を取得
        if (supabaseConfigured) {
          // 本番環境: Supabaseからデータを取得
          try {
            const response = await fetch(`/api/staff?id=${staffId}`)
            const responseData = await response.json()

            if (!response.ok) {
              console.error("Failed to fetch staff:", responseData.error)
              setError(`スタッフ情報の取得に失敗しました: ${responseData.error}`)
              setLoading(false)
              return
            }

            if (!responseData.data) {
              console.error("No staff data returned")
              setError("スタッフ情報が見つかりません")
              setLoading(false)
              return
            }

            setStaff(responseData.data)
          } catch (err) {
            console.error("Error fetching staff:", err)
            setError("スタッフ情報の取得中にエラーが発生しました")
            setLoading(false)
            return
          }
        } else {
          setError("Supabaseが設定されていません")
          setLoading(false)
          return
        }

        // チーム情報を取得
        await refreshTeams()

        // チェックポイント情報を取得
        const checkpointsData = await getCheckpoints()
        setCheckpoints(checkpointsData)

        // スタッフに割り当てられたチェックポイントがあれば選択
        if (staff?.checkpoint_id) {
          const assignedCheckpoint = checkpointsData.find((cp) => cp.id === staff.checkpoint_id)
          if (assignedCheckpoint) {
            setSelectedCheckpoint(assignedCheckpoint)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Error in staff dashboard:", err)
        setError("データの読み込み中にエラーが発生しました")
        setLoading(false)
      }
    }

    fetchData()
  }, [router, staff?.checkpoint_id])

  // スタッフのチェックポイントが変更された場合に選択チェックポイントを更新
  useEffect(() => {
    if (staff?.checkpoint_id && checkpoints.length > 0) {
      const assignedCheckpoint = checkpoints.find((cp) => cp.id === staff.checkpoint_id)
      if (assignedCheckpoint) {
        setSelectedCheckpoint(assignedCheckpoint)
      }
    }
  }, [staff?.checkpoint_id, checkpoints])

  const handleLogout = () => {
    localStorage.removeItem("staffId")
    router.push("/staff-login")
  }

  const handleGoHome = () => {
    router.push("/")
  }

  const handleCheckpointCreated = (checkpoint: Checkpoint) => {
    setCheckpoints([...checkpoints, checkpoint])
    setShowAddCheckpoint(false)
  }

  const handleTeamCreated = (team: Team) => {
    refreshTeams()
    setShowAddTeam(false)
  }

  const handleTeamUpdated = (updatedTeam: Team) => {
    refreshTeams()
    setSelectedTeam(null)
    setShowEditTeam(false)
  }

  const handleCheckinSuccess = () => {
    // チーム情報を更新
    refreshTeams()
  }

  // チームの色を直接更新する関数
  const handleUpdateTeamColor = async (team: Team, newColor: string) => {
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ color: newColor }),
      })

      if (!response.ok) {
        console.error("Failed to update team color:", await response.text())
        return false
      }

      await refreshTeams()
      return true
    } catch (error) {
      console.error("Error updating team color:", error)
      return false
    }
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
        <div className="text-center">
          <Alert variant="destructive" className="max-w-md mx-auto rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/staff-login")} className="mt-4 cute-button">
            ログインページに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cute-bg flex flex-col">
      <header className="bg-primary/90 text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-heading">スタッフダッシュボード</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-1"
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">ホーム</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-1"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">ログアウト</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {configError && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>設定エラー</AlertTitle>
            <AlertDescription>
              <p>Supabaseの環境変数が設定されていません。以下の環境変数を設定してください：</p>
              <ul className="list-disc pl-5 mt-2">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {showQRCode && selectedCheckpoint ? (
          <QRCodeDisplay checkpoint={selectedCheckpoint} onClose={() => setShowQRCode(false)} />
        ) : showAddCheckpoint ? (
          <CheckpointForm onSuccess={handleCheckpointCreated} onCancel={() => setShowAddCheckpoint(false)} />
        ) : showAddTeam ? (
          <TeamForm onSuccess={handleTeamCreated} onCancel={() => setShowAddTeam(false)} />
        ) : showEditTeam && selectedTeam ? (
          <TeamForm
            team={selectedTeam}
            onSuccess={handleTeamUpdated}
            onCancel={() => {
              setSelectedTeam(null)
              setShowEditTeam(false)
            }}
          />
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-4 p-1 bg-muted/50 rounded-full">
                <TabsTrigger
                  value="checkin"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  チェックイン
                </TabsTrigger>
                <TabsTrigger
                  value="checkpoints"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  チェックポイント
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Users className="h-4 w-4 mr-2" />
                  チーム
                </TabsTrigger>
                <TabsTrigger
                  value="scoreboard"
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Award className="h-4 w-4 mr-2" />
                  スコアボード
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checkin" className="space-y-4">
                {selectedCheckpoint ? (
                  <CheckinForm checkpoint={selectedCheckpoint} onSuccess={handleCheckinSuccess} />
                ) : (
                  <Card className="cute-card border-primary/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
                    <CardHeader>
                      <CardTitle className="font-heading text-primary">チェックポイントが選択されていません</CardTitle>
                      <CardDescription>
                        チェックインを行うには、まず「チェックポイント」タブで担当するチェックポイントを選択してください。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => setActiveTab("checkpoints")} className="cute-button">
                        チェックポイントを選択
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="checkpoints" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold font-heading">チェックポイント管理</h2>
                  <Button onClick={() => setShowAddCheckpoint(true)} className="cute-button">
                    新規作成
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {checkpoints.map((checkpoint) => (
                    <Card
                      key={checkpoint.id}
                      className={
                        selectedCheckpoint?.id === checkpoint.id
                          ? "cute-card border-2 border-primary animate-pulse-soft"
                          : "cute-card border-primary/30"
                      }
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-heading">{checkpoint.name}</CardTitle>
                        <CardDescription className="text-xs">ID: {checkpoint.id}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm mb-2">{checkpoint.description}</p>
                        <p className="text-sm">
                          ポイント: <span className="font-bold">{checkpoint.point_value}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          位置: {checkpoint.latitude}, {checkpoint.longitude}
                        </p>
                      </CardContent>
                      <CardContent className="flex gap-2 pt-0">
                        <Button
                          variant={selectedCheckpoint?.id === checkpoint.id ? "default" : "outline"}
                          size="sm"
                          className={
                            selectedCheckpoint?.id === checkpoint.id ? "cute-button flex-1" : "rounded-full flex-1"
                          }
                          onClick={() => setSelectedCheckpoint(checkpoint)}
                        >
                          {selectedCheckpoint?.id === checkpoint.id ? "選択中" : "選択"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full flex-1"
                          onClick={() => {
                            setSelectedCheckpoint(checkpoint)
                            setShowQRCode(true)
                          }}
                        >
                          QRコード
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="teams" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold font-heading">チーム管理</h2>
                  <Button onClick={() => setShowAddTeam(true)} className="cute-button">
                    新規作成
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <Card key={team.id} className="cute-card border-primary/30 overflow-hidden">
                      <div style={{ backgroundColor: team.color, height: "8px" }}></div>
                      <CardHeader className="pb-2" style={{ backgroundColor: `${team.color}10` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                          <CardTitle className="text-lg font-heading">{team.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">チームID: {team.id}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-center text-2xl font-bold">{team.total_score} ポイント</p>
                      </CardContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">チームカラー:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={team.color}
                              onChange={(e) => handleUpdateTeamColor(team, e.target.value)}
                              className="w-12 h-8 p-1 rounded-lg"
                            />
                            <span className="text-sm">{team.color}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full border-primary/30 hover:bg-primary/10"
                          onClick={() => {
                            setSelectedTeam(team)
                            setShowEditTeam(true)
                          }}
                        >
                          詳細編集
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="scoreboard">
                <Scoreboard />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <footer className="bg-muted py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} ELT学外オリエンテーション</p>
        </div>
      </footer>
    </div>
  )
}

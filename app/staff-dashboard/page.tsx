"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Home, LogOut, MapPin, Users, Award, QrCode, RefreshCw } from "lucide-react"
import { isSupabaseConfigured, getCheckpoints, type Team, type Checkpoint, type Staff } from "@/lib/supabase"
import CheckpointForm from "@/components/staff/checkpoint-form"
import TeamForm from "@/components/staff/team-form"
import QRCodeDisplay from "@/components/staff/qr-code-display"
import CheckinForm from "@/components/staff/checkin-form"
import Scoreboard from "@/components/scoreboard"
import { useToast } from "@/hooks/use-toast"

export default function StaffDashboard() {
  const { toast } = useToast()
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
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [retryCount, setRetryCount] = useState(0)
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

  // スタッフ情報を取得する関数
  const fetchStaffData = async (staffId: string) => {
    try {
      console.log(`Fetching staff with ID: ${staffId}`)
      const response = await fetch(`/api/staff?id=${staffId}`)
      const responseData = await response.json()

      if (!response.ok) {
        console.error("Failed to fetch staff:", responseData)
        setDebugInfo(responseData)

        if (responseData.error === "Staff not found") {
          toast({
            title: "スタッフ情報が見つかりません",
            description: "デフォルトのスタッフアカウントを作成します",
            variant: "warning",
          })
        }

        throw new Error(`スタッフ情報の取得に失敗しました: ${responseData.error}`)
      }

      if (!responseData.data) {
        console.error("No staff data returned:", responseData)
        setDebugInfo(responseData)
        throw new Error("スタッフ情報が見つかりません")
      }

      console.log("Staff data retrieved successfully:", responseData.data)
      setStaff(responseData.data)

      // 新しく作成されたスタッフの場合、通知を表示
      if (responseData.message === "Created default staff record") {
        toast({
          title: "デフォルトのスタッフアカウントを作成しました",
          description: "このアカウントは一時的なものです。適切な権限設定を行ってください。",
          duration: 5000,
        })
      }

      return responseData.data
    } catch (err) {
      console.error("Error fetching staff:", err)
      throw err
    }
  }

  useEffect(() => {
    // ローカルストレージからスタッフIDを取得
    let staffId = localStorage.getItem("staffId")

    // スタッフIDがない場合は、緊急用のデフォルトIDを設定
    if (!staffId) {
      console.log("No staffId found in localStorage, using default ID 1")
      staffId = "1"
      localStorage.setItem("staffId", staffId)
    }

    // Supabaseが設定されているか確認
    const supabaseConfigured = isSupabaseConfigured()
    setConfigError(!supabaseConfigured)

    async function fetchData() {
      try {
        // スタッフ情報を取得
        if (supabaseConfigured) {
          try {
            const staffData = await fetchStaffData(staffId!)

            // チーム情報を取得
            await refreshTeams()

            // チェックポイント情報を取得
            try {
              const checkpointsData = await getCheckpoints()
              setCheckpoints(checkpointsData)

              // スタッフに割り当てられたチェックポイントがあれば選択
              if (staffData?.checkpoint_id) {
                const assignedCheckpoint = checkpointsData.find((cp) => cp.id === staffData.checkpoint_id)
                if (assignedCheckpoint) {
                  setSelectedCheckpoint(assignedCheckpoint)
                }
              }
            } catch (err) {
              console.error("Error fetching checkpoints:", err)
              // チェックポイント取得エラーは致命的ではないので、続行する
            }
          } catch (err) {
            if (retryCount < 2) {
              // 最大2回までリトライ
              setRetryCount((prev) => prev + 1)
              setError(`スタッフ情報の取得に失敗しました。リトライ中... (${retryCount + 1}/3)`)
              setTimeout(() => {
                fetchData() // 再試行
              }, 1000)
              return
            }

            setError(`スタッフ情報の取得に失敗しました。(${err instanceof Error ? err.message : String(err)})`)
          }
        } else {
          setError("Supabaseが設定されていません")
        }
      } catch (err) {
        console.error("Error in staff dashboard:", err)
        setError("データの読み込み中にエラーが発生しました")
        setDebugInfo(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, toast])

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

  // 手動でデータを再読み込み
  const handleRefreshData = async () => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      // スタッフIDを取得
      const staffId = localStorage.getItem("staffId") || "1"

      // スタッフ情報を再取得
      await fetchStaffData(staffId)

      // チーム情報を再取得
      await refreshTeams()

      // チェックポイント情報を再取得
      const checkpointsData = await getCheckpoints()
      setCheckpoints(checkpointsData)

      toast({
        title: "更新完了",
        description: "データを最新の状態に更新しました",
        duration: 3000,
      })
    } catch (err) {
      console.error("Error refreshing data:", err)
      setError("データの更新に失敗しました")
      setDebugInfo(err)
    } finally {
      setLoading(false)
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

          {/* デバッグ情報を表示 */}
          {debugInfo && (
            <div className="mt-4 p-4 bg-black/10 rounded-xl text-left max-w-md mx-auto overflow-auto max-h-60">
              <p className="text-sm font-mono mb-2">デバッグ情報:</p>
              <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}

          <div className="mt-4 flex gap-2 justify-center">
            <Button onClick={handleRefreshData} className="cute-button flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              再読み込み
            </Button>
            <Button onClick={() => router.push("/staff-login")} variant="outline">
              ログインページに戻る
            </Button>
            <Button
              onClick={() => {
                localStorage.setItem("staffId", "1")
                window.location.reload()
              }}
              variant="outline"
            >
              緊急アクセス
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // スタッフ情報がない場合でも、最低限の機能を提供
  const staffName = staff?.name || "スタッフ（未認証）"

  return (
    <div className="min-h-screen cute-bg flex flex-col">
      <header className="bg-primary/90 text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-heading">スタッフダッシュボード</h1>
            <span className="text-sm opacity-80">({staffName})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 flex items-center gap-1"
              onClick={handleRefreshData}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">更新</span>
            </Button>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                      onClick={async () => {
                        const confirmed = confirm("全チームの位置情報をリセットしますか？\nこの操作は取り消せません。")
                        if (!confirmed) return

                        try {
                          const response = await fetch("/api/reset-team-locations", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                          })

                          const result = await response.json()
                          if (result.success) {
                            toast({
                              title: "成功",
                              description: result.message,
                              duration: 3000,
                            })
                            // チーム情報を再読み込み
                            refreshTeams()
                          } else {
                            toast({
                              title: "エラー",
                              description: result.error || "操作に失敗しました",
                              variant: "destructive",
                              duration: 3000,
                            })
                          }
                        } catch (error) {
                          console.error("Error resetting team locations:", error)
                          toast({
                            title: "エラー",
                            description: "位置情報のリセットに失敗しました",
                            variant: "destructive",
                            duration: 3000,
                          })
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      位置情報リセット
                    </Button>
                    <Button onClick={() => setShowAddTeam(true)} className="cute-button">
                      新規作成
                    </Button>
                  </div>
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
                        <CardDescription className="text-xs flex items-center gap-2">
                          <span>チームコード:</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">
                            {team.team_code || team.id.toString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0"
                            onClick={() => {
                              navigator.clipboard.writeText(team.team_code || team.id.toString())
                              toast({
                                title: "コピーしました",
                                description: `チームコード ${team.team_code || team.id} をクリップボードにコピーしました`,
                                duration: 2000,
                              })
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-copy"
                            >
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          </Button>
                        </CardDescription>
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

              <TabsContent value="scoreboard" className="space-y-4">
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

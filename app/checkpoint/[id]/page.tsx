"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function CheckpointPage({ params }: { params: { id: string } }) {
  const [checkpoint, setCheckpoint] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinStatus, setCheckinStatus] = useState<{
    success?: boolean
    message?: string
    debug?: any
  } | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()

  // デバッグ情報を追加する関数
  const addDebugInfo = (message: string) => {
    setDebugInfo((prev) => `${prev}\n${new Date().toISOString().split("T")[1]}: ${message}`)
    console.log(message)
  }

  useEffect(() => {
    addDebugInfo(`Checkpoint page loaded with ID: ${params.id}`)

    // チェックポイントIDが数値かどうか確認
    if (!/^\d+$/.test(params.id)) {
      addDebugInfo(`Invalid checkpoint ID format: ${params.id}`)
      setLoading(false)
      setCheckinStatus({
        success: false,
        message: "無効なチェックポイントIDです。数値のみ使用できます。",
      })
      return
    }

    const teamId = localStorage.getItem("teamId")
    if (!teamId) {
      addDebugInfo("No teamId found in localStorage, redirecting to login")
      router.push("/team-login")
      return
    }

    addDebugInfo(`TeamId found: ${teamId}, checkpoint: ${params.id}`)

    async function fetchData() {
      try {
        addDebugInfo("Fetching checkpoint data...")
        // チェックポイント情報を取得
        const checkpointResponse = await fetch(`/api/checkpoints/${params.id}`)

        if (!checkpointResponse.ok) {
          const errorText = await checkpointResponse.text()
          addDebugInfo(`Failed to fetch checkpoint: ${errorText}`)
          setLoading(false)
          setCheckinStatus({
            success: false,
            message: "チェックポイントの取得に失敗しました。",
            debug: { status: checkpointResponse.status, error: errorText },
          })
          return
        }

        const checkpointData = await checkpointResponse.json()
        addDebugInfo(`Checkpoint data: ${JSON.stringify(checkpointData)}`)
        setCheckpoint(checkpointData.data)

        addDebugInfo("Fetching team data...")
        // チーム情報を取得
        const teamResponse = await fetch(`/api/teams/${teamId}`)

        if (!teamResponse.ok) {
          const errorText = await teamResponse.text()
          addDebugInfo(`Failed to fetch team: ${errorText}`)
          router.push("/team-login")
          return
        }

        const teamData = await teamResponse.json()
        addDebugInfo(`Team data: ${JSON.stringify(teamData)}`)
        setTeam(teamData.data)

        addDebugInfo("Checking if already checked in...")
        // 既にチェックイン済みかチェック
        const checkinsResponse = await fetch(`/api/teams/${teamId}/checkins`)
        const checkinsData = await checkinsResponse.json()
        addDebugInfo(`Checkins data: ${JSON.stringify(checkinsData)}`)

        const existingCheckin = checkinsData.data?.find((checkin: any) => checkin.checkpoint_id === Number(params.id))

        if (existingCheckin) {
          addDebugInfo(`Already checked in: ${JSON.stringify(existingCheckin)}`)
          setAlreadyCheckedIn(true)
        } else {
          addDebugInfo("Not checked in yet")
        }

        setLoading(false)
      } catch (err) {
        addDebugInfo(`Error in checkpoint page: ${err}`)
        setLoading(false)
        setCheckinStatus({
          success: false,
          message: "データの取得中にエラーが発生しました。",
          debug: { error: String(err) },
        })
      }
    }

    fetchData()
  }, [params.id, router])

  const handleCheckin = async () => {
    if (!team || !checkpoint) {
      addDebugInfo("Team or checkpoint data missing")
      return
    }

    setCheckinLoading(true)
    addDebugInfo(`Attempting checkin: teamId=${team.id}, checkpointId=${checkpoint.id}`)

    try {
      // チェックインAPIを直接呼び出す
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: team.id,
          checkpointId: checkpoint.id,
        }),
      })

      const responseText = await response.text()
      addDebugInfo(`Checkin API response: ${responseText}`)

      try {
        const result = JSON.parse(responseText)
        setCheckinStatus(result)

        if (result.success) {
          addDebugInfo("Checkin successful")
          setAlreadyCheckedIn(true)

          // チーム情報を更新
          addDebugInfo("Updating team info...")
          const teamResponse = await fetch(`/api/teams/${team.id}`)
          const teamData = await teamResponse.json()
          addDebugInfo(`Updated team data: ${JSON.stringify(teamData)}`)

          if (teamData.data) {
            setTeam(teamData.data)
          }
        } else {
          addDebugInfo(`Checkin failed: ${result.message}`)
        }
      } catch (e) {
        addDebugInfo(`Error parsing checkin response: ${e}, response: ${responseText}`)
        setCheckinStatus({
          success: false,
          message: "チェックイン結果の解析に失敗しました",
          debug: { error: String(e), response: responseText },
        })
      }
    } catch (error) {
      addDebugInfo(`Error during checkin: ${error}`)
      setCheckinStatus({
        success: false,
        message: "チェックイン処理中にエラーが発生しました",
        debug: { error: String(error) },
      })
    } finally {
      setCheckinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen cute-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-bounce-slow">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-4 text-lg font-heading">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!checkpoint) {
    return (
      <div className="min-h-screen cute-bg flex items-center justify-center">
        <Card className="max-w-md mx-auto cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-primary">チェックポイントが見つかりません</CardTitle>
            <CardDescription>チェックポイントID: {params.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkinStatus && (
              <Alert variant="destructive" className="mt-4 rounded-xl border-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{checkinStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 p-4 bg-white/80 rounded-lg text-xs text-left">
              <p className="font-bold mb-2">デバッグ情報:</p>
              <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/dashboard")} className="w-full cute-button">
              ダッシュボードに戻る
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen cute-bg flex flex-col">
      <header className="bg-primary/90 text-primary-foreground p-4">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => router.push("/dashboard")}
          >
            ← 戻る
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-primary">{checkpoint.name}</CardTitle>
            <CardDescription>チェックポイント #{checkpoint.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-bold mb-2 font-heading">ミッション内容</h3>
              <p>{checkpoint.description || "このチェックポイントにチェックインしてポイントを獲得しましょう！"}</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-bold mb-2 font-heading">獲得ポイント</h3>
              <p className="text-2xl font-bold text-center">{checkpoint.point_value}点</p>
            </div>

            {checkinStatus && (
              <Alert variant={checkinStatus.success ? "default" : "destructive"} className="mt-4 rounded-xl border-2">
                {checkinStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{checkinStatus.success ? "成功" : "エラー"}</AlertTitle>
                <AlertDescription>{checkinStatus.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full cute-button"
              onClick={handleCheckin}
              disabled={checkinLoading || alreadyCheckedIn}
            >
              {alreadyCheckedIn ? (
                "チェックイン済み"
              ) : checkinLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  処理中...
                </span>
              ) : (
                "チェックイン"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* デバッグ情報 */}
        <div className="mt-8 max-w-md mx-auto">
          <details className="bg-white/80 p-4 rounded-lg text-xs">
            <summary className="font-bold cursor-pointer">デバッグ情報</summary>
            <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-60">{debugInfo}</pre>
          </details>
        </div>
      </main>

      <footer className="bg-muted p-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
      </footer>
    </div>
  )
}

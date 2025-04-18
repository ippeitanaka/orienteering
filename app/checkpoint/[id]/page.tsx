"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function CheckpointPage({ params }: { params: { id: string } }) {
  const [checkpoint, setCheckpoint] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkinStatus, setCheckinStatus] = useState<{
    success?: boolean
    message?: string
  } | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const teamId = localStorage.getItem("teamId")
    if (!teamId) {
      router.push("/team-login")
      return
    }

    async function fetchData() {
      try {
        // チェックポイント情報を取得
        const checkpointResponse = await fetch(`/api/checkpoints/${params.id}`)

        if (!checkpointResponse.ok) {
          console.error("Failed to fetch checkpoint:", await checkpointResponse.text())
          router.push("/dashboard")
          return
        }

        const checkpointData = await checkpointResponse.json()
        console.log("Checkpoint data:", checkpointData)
        setCheckpoint(checkpointData.data)

        // チーム情報を取得
        const teamResponse = await fetch(`/api/teams/${teamId}`)

        if (!teamResponse.ok) {
          console.error("Failed to fetch team:", await teamResponse.text())
          router.push("/team-login")
          return
        }

        const teamData = await teamResponse.json()
        console.log("Team data:", teamData)
        setTeam(teamData.data)

        // 既にチェックイン済みかチェック
        const checkinsResponse = await fetch(`/api/teams/${teamId}/checkins`)
        const checkinsData = await checkinsResponse.json()
        console.log("Checkins data:", checkinsData)

        const existingCheckin = checkinsData.data?.find((checkin: any) => checkin.checkpoint_id === Number(params.id))

        if (existingCheckin) {
          setAlreadyCheckedIn(true)
        }

        setLoading(false)
      } catch (err) {
        console.error("Error in checkpoint page:", err)
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, router])

  const handleCheckin = async () => {
    if (!team || !checkpoint) return

    setLoading(true)
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

      const result = await response.json()
      setCheckinStatus(result)
      setLoading(false)

      if (result.success) {
        setAlreadyCheckedIn(true)

        // チーム情報を更新
        const teamResponse = await fetch(`/api/teams/${team.id}`)
        const teamData = await teamResponse.json()

        if (teamData.data) {
          setTeam(teamData.data)
        }
      }
    } catch (error) {
      console.error("Error checking in:", error)
      setCheckinStatus({
        success: false,
        message: "チェックイン処理中にエラーが発生しました",
      })
      setLoading(false)
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

  if (!checkpoint || !team) {
    return (
      <div className="min-h-screen cute-bg flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 font-heading">チェックポイントが見つかりません</p>
          <Button onClick={() => router.push("/dashboard")} className="cute-button">
            ダッシュボードに戻る
          </Button>
        </div>
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
            <Button className="w-full cute-button" onClick={handleCheckin} disabled={loading || alreadyCheckedIn}>
              {alreadyCheckedIn ? "チェックイン済み" : loading ? "処理中..." : "チェックイン"}
            </Button>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-muted p-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ELT学外オリエンテーション</p>
      </footer>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function TeamDashboard() {
  const [teamName, setTeamName] = useState<string | null>(null)
  const [teamCode, setTeamCode] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // チームセッションを確認
    const checkTeamSession = async () => {
      try {
        const response = await fetch("/api/teams/session")
        const data = await response.json()

        if (!response.ok || !data.authenticated) {
          router.push("/team-login")
          return
        }

        setTeamName(data.team?.name || "チーム")
        setTeamCode(data.team?.team_code || "")
      } catch (err) {
        console.error("セッション確認エラー:", err)
        router.push("/team-login")
      }
    }

    checkTeamSession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/teams/logout", { method: "POST" })
      router.push("/team-login")
    } catch (err) {
      setError("ログアウト中にエラーが発生しました")
    }
  }

  if (!teamName) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">チームダッシュボード</h1>
        <div className="flex items-center gap-4">
          <span>チーム: {teamName}</span>
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>チーム情報</CardTitle>
        </CardHeader>
        <CardContent>
          <p>チーム名: {teamName}</p>
          <p>チームコード: {teamCode}</p>
        </CardContent>
      </Card>

      {/* ここに他のチームダッシュボードコンテンツを追加 */}
    </div>
  )
}

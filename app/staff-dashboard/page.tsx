"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CheckpointManager from "./components/checkpoint-manager"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function StaffDashboard() {
  const [staffName, setStaffName] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // スタッフセッションを確認
    const checkStaffSession = async () => {
      try {
        const response = await fetch("/api/staff/session")
        const data = await response.json()

        if (!response.ok || !data.authenticated) {
          router.push("/staff-login")
          return
        }

        setStaffName(data.staff?.name || "スタッフ")
      } catch (err) {
        console.error("セッション確認エラー:", err)
        router.push("/staff-login")
      }
    }

    checkStaffSession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/staff/logout", { method: "POST" })
      router.push("/staff-login")
    } catch (err) {
      setError("ログアウト中にエラーが発生しました")
    }
  }

  if (!staffName) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">スタッフダッシュボード</h1>
        <div className="flex items-center gap-4">
          <span>ようこそ、{staffName}さん</span>
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

      <Tabs defaultValue="checkpoints">
        <TabsList className="mb-4">
          <TabsTrigger value="checkpoints">チェックポイント</TabsTrigger>
          <TabsTrigger value="teams">チーム</TabsTrigger>
          <TabsTrigger value="scoreboard">スコアボード</TabsTrigger>
        </TabsList>
        <TabsContent value="checkpoints">
          <CheckpointManager />
        </TabsContent>
        <TabsContent value="teams">
          <div className="text-center py-8">チーム管理機能は準備中です</div>
        </TabsContent>
        <TabsContent value="scoreboard">
          <div className="text-center py-8">スコアボード機能は準備中です</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

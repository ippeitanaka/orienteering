"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, LogOut } from "lucide-react"
import CheckpointManager from "./components/checkpoint-manager"
import TeamManager from "./components/team-manager"
import Scoreboard from "@/components/scoreboard"
import { getCheckpoints, getTeams } from "@/lib/supabase"

export default function StaffDashboardPage() {
  const [staffName, setStaffName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [teams, setTeams] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // ローカルストレージからスタッフ情報を取得
    const storedStaffName = localStorage.getItem("staffName")

    if (!storedStaffName) {
      // セッションがない場合はログインページにリダイレクト
      router.push("/staff-login")
      return
    }

    setStaffName(storedStaffName)
    setLoading(false)

    // チェックポイントとチームのデータを取得
    async function fetchData() {
      try {
        setDataLoading(true)
        const [checkpointsData, teamsData] = await Promise.all([getCheckpoints(), getTeams()])
        setCheckpoints(checkpointsData)
        setTeams(teamsData)
      } catch (err) {
        console.error("データ取得エラー:", err)
        setError("データの取得中にエラーが発生しました")
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/staff/logout", {
        method: "POST",
      })

      // ローカルストレージからスタッフ情報を削除
      localStorage.removeItem("staffId")
      localStorage.removeItem("staffName")
      localStorage.removeItem("staffCheckpointId")

      // ログインページにリダイレクト
      router.push("/staff-login")
    } catch (err) {
      console.error("Logout error:", err)
      setError("ログアウト中にエラーが発生しました")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4">ログイン情報を確認中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-500">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Link href="/staff-login">
                <Button>ログインページに戻る</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">スタッフダッシュボード</h1>
              <p className="text-gray-600 dark:text-gray-300">
                ようこそ、<span className="font-medium text-primary">{staffName}</span> さん
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </header>

        <Tabs defaultValue="checkpoints" className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="checkpoints">チェックポイント管理</TabsTrigger>
            <TabsTrigger value="teams">チーム管理</TabsTrigger>
            <TabsTrigger value="scoreboard">スコアボード</TabsTrigger>
          </TabsList>

          <TabsContent value="checkpoints">
            <CheckpointManager />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManager />
          </TabsContent>

          <TabsContent value="scoreboard">
            <Card>
              <CardHeader>
                <CardTitle>スコアボード</CardTitle>
                <CardDescription>チームのスコアとランキングを確認します</CardDescription>
              </CardHeader>
              <CardContent>
                <Scoreboard />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} ELT学外オリエンテーション</p>
        </div>
      </div>
    </div>
  )
}

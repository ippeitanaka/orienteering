"use client"

// 既存のインポートに追加
import TimerControl from "@/components/staff/timer-control"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Scoreboard from "@/components/scoreboard"
import AddPointsForm from "@/components/staff/add-points-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// 既存のコードを修正
export default function StaffDashboardPage() {
  // 既存のコード...
  const staffName = "管理者" // 仮のスタッフ名
  const handleLogout = () => {
    alert("ログアウト処理は未実装です。")
  }
  const teams = []

  const fetchData = () => {
    console.log("fetchData called")
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
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="checkpoints">チェックポイント管理</TabsTrigger>
            <TabsTrigger value="teams">チーム管理</TabsTrigger>
            <TabsTrigger value="scoreboard">スコアボード</TabsTrigger>
            <TabsTrigger value="timer">タイマー</TabsTrigger>
          </TabsList>

          <TabsContent value="checkpoints">
            <Card>
              <CardHeader>
                <CardTitle>チェックポイント管理</CardTitle>
                <CardDescription>チェックポイントの作成、編集、削除を行います</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>チェックポイント管理機能は現在準備中です。</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <CardTitle>チーム管理</CardTitle>
                <CardDescription>チームの作成、編集、削除を行います</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>チーム管理機能は現在準備中です。</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scoreboard">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>スコアボード</CardTitle>
                  <CardDescription>チームのスコアとランキングを確認します</CardDescription>
                </CardHeader>
                <CardContent>
                  <Scoreboard />
                </CardContent>
              </Card>

              <div>
                <AddPointsForm teams={teams} onSuccess={fetchData} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timer">
            <TimerControl />
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
        </div>
      </div>
    </div>
  )
}

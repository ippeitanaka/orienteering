"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkTeamSession() {
      try {
        const response = await fetch("/api/teams/session")

        // レスポンスのステータスコードとコンテンツタイプを確認
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/team-login")
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // レスポンスがJSONかどうか確認
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Expected JSON response but got ${contentType}`)
        }

        const data = await response.json()

        if (!data.authenticated) {
          router.push("/team-login")
          return
        }

        setTeam(data.team)
        setLoading(false)
      } catch (err) {
        console.error("Session check error:", err)
        setError(err instanceof Error ? err.message : "セッション確認中にエラーが発生しました")
        setLoading(false)
      }
    }

    checkTeamSession()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/teams/logout", { method: "POST" })
      router.push("/team-login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
            <p className="text-center mb-4">{error}</p>
            <div className="flex justify-center">
              <Link href="/team-login">
                <Button>ログインページに戻る</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">チームダッシュボード</h1>
        <div className="flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-300">
            ようこそ、
            <span className="font-medium" style={{ color: team?.color }}>
              {team?.name}
            </span>{" "}
            さん
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </header>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="map">マップ</TabsTrigger>
          <TabsTrigger value="scoreboard">スコアボード</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>マップ</CardTitle>
              <CardDescription>チェックポイントと現在位置を確認します</CardDescription>
            </CardHeader>
            <CardContent>
              <p>マップ機能は開発中です。</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoreboard">
          <Card>
            <CardHeader>
              <CardTitle>スコアボード</CardTitle>
              <CardDescription>チームのスコアとランキングを確認します</CardDescription>
            </CardHeader>
            <CardContent>
              <p>スコアボード機能は開発中です。</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

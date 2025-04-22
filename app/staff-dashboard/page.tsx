"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import TimerControl from "@/components/staff/timer-control"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Scoreboard from "@/components/scoreboard"
import AddPointsForm from "@/components/staff/add-points-form"
import CheckpointManager from "@/components/staff/checkpoint-manager"
import TeamManager from "@/components/staff/team-manager"
import { getTeams, type Team } from "@/lib/supabase"

export default function StaffDashboardPage() {
  const [staffName, setStaffName] = useState<string>("管理者")
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // スタッフセッションを確認
    async function checkStaffSession() {
      try {
        const response = await fetch("/api/staff/session")
        const data = await response.json()

        if (!data.authenticated) {
          router.push("/staff-login")
          return
        }

        if (data.staff) {
          setStaffName(data.staff.name)
        }
      } catch (err) {
        console.error("Session check error:", err)
      }
    }

    // チームデータを取得
    async function fetchTeams() {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData)
        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch teams:", err)
        setLoading(false)
      }
    }

    checkStaffSession()
    fetchTeams()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/staff/logout", { method: "POST" })
      router.push("/staff-login")
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  const fetchData = async () => {
    try {
      const teamsData = await getTeams()
      setTeams(teamsData)
    } catch (err) {
      console.error("Failed to fetch teams:", err)
    }
  }

  return (
    <div className="elt-bg min-h-screen">
      <div className="elt-container">
        <header className="mb-8 bg-card p-4 rounded-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/images/elt-logo.png" alt="ELT 26周年記念ロゴ" width={80} height={48} className="elt-logo" />
              <div>
                <h1 className="text-2xl font-bold">スタッフダッシュボード</h1>
                <p className="text-muted-foreground">
                  ようこそ、<span className="font-medium text-primary">{staffName}</span> さん
                </p>
              </div>
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
            <CheckpointManager />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManager />
          </TabsContent>

          <TabsContent value="scoreboard">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="elt-card">
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

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import TeamManager from "./components/team-manager"
import CheckpointManager from "./components/checkpoint-manager"
import TimerManager from "./components/timer-manager"
import { Clock } from "lucide-react"

export default function StaffDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/staff/session")
        const data = await response.json()

        if (!data.authenticated) {
          router.push("/staff-login")
        } else {
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        toast({
          title: "エラー",
          description: "認証状態の確認中にエラーが発生しました",
          variant: "destructive",
        })
        router.push("/staff-login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/staff/logout", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "ログアウト成功",
          description: "スタッフアカウントからログアウトしました",
        })
        router.push("/")
      } else {
        throw new Error("Logout failed")
      }
    } catch (error) {
      console.error("Error during logout:", error)
      toast({
        title: "エラー",
        description: "ログアウト中にエラーが発生しました",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">東洋医療専門学校　救急救命士学科 - スタッフダッシュボード</h1>
        <Button variant="outline" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="mb-4">
          <TabsTrigger value="teams">チーム管理</TabsTrigger>
          <TabsTrigger value="checkpoints">チェックポイント管理</TabsTrigger>
          <TabsTrigger value="timer" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            タイマー管理
          </TabsTrigger>
        </TabsList>
        <TabsContent value="teams">
          <TeamManager />
        </TabsContent>
        <TabsContent value="checkpoints">
          <CheckpointManager />
        </TabsContent>
        <TabsContent value="timer">
          <TimerManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

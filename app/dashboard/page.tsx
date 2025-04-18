"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Trophy, LogOut } from "lucide-react"
import MapView from "@/components/map-view"
import Scoreboard from "@/components/scoreboard"
import QRScanner from "@/components/qr-scanner"
import CountdownTimer from "@/components/countdown-timer"

export default function Dashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/teams/session")
        const data = await response.json()

        if (!data.authenticated) {
          router.push("/team-login")
        } else {
          setIsAuthenticated(true)
          setTeamId(data.teamId)
          setTeamName(data.teamName)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        toast({
          title: "エラー",
          description: "認証状態の確認中にエラーが発生しました",
          variant: "destructive",
        })
        router.push("/team-login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/teams/logout", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "ログアウト成功",
          description: "チームアカウントからログアウトしました",
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

  if (!isAuthenticated || !teamId) {
    return null
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">東洋医療専門学校　救急救命士学科</h1>
          <p className="text-muted-foreground">チーム: {teamName}</p>
        </div>
        <div className="flex items-center gap-4">
          <CountdownTimer compact />
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      <Tabs defaultValue="map">
        <TabsList className="mb-4">
          <TabsTrigger value="map" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            マップ
          </TabsTrigger>
          <TabsTrigger value="score" className="flex items-center">
            <Trophy className="h-4 w-4 mr-2" />
            スコア
          </TabsTrigger>
          <TabsTrigger value="qr">QRスキャン</TabsTrigger>
        </TabsList>
        <TabsContent value="map">
          <MapView teamId={teamId} />
        </TabsContent>
        <TabsContent value="score">
          <CountdownTimer />
          <Scoreboard teamId={teamId} />
        </TabsContent>
        <TabsContent value="qr">
          <QRScanner teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

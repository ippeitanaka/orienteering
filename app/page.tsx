"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, QrCode, Trophy, Users, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Home() {
  const [teamId, setTeamId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // ローカルストレージからチームIDを取得
  useEffect(() => {
    const storedTeamId = localStorage.getItem("teamId")
    if (storedTeamId) {
      setTeamId(storedTeamId)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // チームIDの検証
      const response = await fetch(`/api/teams/${teamId}`)
      const result = await response.json()

      if (!response.ok || !result.data) {
        setError("チームIDが正しくありません")
        setLoading(false)
        return
      }

      // チームIDをローカルストレージに保存
      localStorage.setItem("teamId", teamId)
      router.push("/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン中にエラーが発生しました")
      setLoading(false)
    }
  }

  const handleStaffLogin = () => {
    router.push("/staff-login")
  }

  return (
    <div className="min-h-screen cute-bg flex flex-col">
      <header className="bg-primary/90 text-primary-foreground py-6 shadow-md relative">
        <h1 className="text-3xl font-bold text-center font-heading">ELT学外オリエンテーション</h1>
        <p className="text-center text-primary-foreground/80 mt-1">オリエンテーリングアプリ</p>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="cute-card border-primary/30 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
            <CardHeader>
              <CardTitle className="text-center text-primary font-heading">チームログイン</CardTitle>
              <CardDescription className="text-center">
                チームIDを入力してオリエンテーリングを開始しましょう
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamId" className="font-medium">
                    チームID
                  </Label>
                  <Input
                    id="teamId"
                    type="text"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    required
                    className="cute-input"
                    placeholder="チームIDを入力"
                  />
                </div>
                {error && <div className="text-destructive text-sm font-medium">{error}</div>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full cute-button" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                      ログイン中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      チームでログイン
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="cute-card border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  マップ機能
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  チームの現在位置とチェックポイントをリアルタイムで地図上に表示します。他のチームの位置も確認できます。
                </p>
              </CardContent>
            </Card>

            <Card className="cute-card border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  QRスキャン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  チェックポイントに設置されたQRコードをスキャンして、ポイントを獲得しましょう。
                </p>
              </CardContent>
            </Card>

            <Card className="cute-card border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  スコアボード
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">リアルタイムで更新されるスコアボードで、チーム間の順位を確認できます。</p>
              </CardContent>
            </Card>
          </div>

          <Alert className="bg-muted/50 border-primary/20">
            <Info className="h-4 w-4" />
            <AlertTitle>ヘルプ</AlertTitle>
            <AlertDescription className="text-sm">
              チームIDがわからない場合は、スタッフに確認してください。
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <footer className="bg-muted py-4 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} ELT学外オリエンテーション</p>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground hover:text-primary text-sm mt-1"
            onClick={handleStaffLogin}
          >
            スタッフログイン
          </Button>
        </div>
      </footer>

      {/* 装飾的な背景要素 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[30%] left-[-5%] w-72 h-72 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] right-[10%] w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}

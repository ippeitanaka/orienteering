"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Hash } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TeamLoginPage() {
  const [teamCode, setTeamCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo(null)

    try {
      console.log("Attempting team login with code:", teamCode)

      const response = await fetch("/api/teams/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ team_code: teamCode }),
      })

      const data = await response.json()
      console.log("Team login response:", data)

      if (!response.ok) {
        setError(data.error || "ログイン中にエラーが発生しました")
        if (data.debug) {
          setDebugInfo(data.debug)
        }
        setLoading(false)
        return
      }

      // ログイン成功時にローカルストレージにチームIDを保存
      if (data.team && data.team.id) {
        localStorage.setItem("teamId", data.team.id.toString())
        localStorage.setItem("teamName", data.team.name)
        localStorage.setItem("teamCode", data.team.team_code || "")
      }

      // ダッシュボードにリダイレクト
      router.push("/dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン処理中にエラーが発生しました")
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          ホームに戻る
        </Link>

        <Card className="cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="text-center font-heading">チームログイン</CardTitle>
            <CardDescription className="text-center">
              チームコードを入力してオリエンテーリングに参加しましょう
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamCode" className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  チームコード
                </Label>
                <Input
                  id="teamCode"
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="チームコードを入力"
                  className="cute-input"
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full cute-button" disabled={loading}>
                {loading ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></span>
                    ログイン中...
                  </span>
                ) : (
                  "ログイン"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {debugInfo && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-auto">
            <h3 className="font-bold mb-2">デバッグ情報:</h3>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
    <div className="elt-bg min-h-screen">
      <div className="elt-container">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ホームに戻る
          </Link>

          <Card className="elt-card">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Image
                  src="/images/elt-logo.png"
                  alt="ELT 26周年記念ロゴ"
                  width={120}
                  height={72}
                  className="elt-logo"
                />
              </div>
              <CardTitle className="text-center">チームログイン</CardTitle>
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
                    className="elt-input"
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
                <Button type="submit" className="elt-button w-full" disabled={loading}>
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
            <div className="mt-6 p-4 bg-card rounded-md text-xs overflow-auto">
              <h3 className="font-bold mb-2">デバッグ情報:</h3>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

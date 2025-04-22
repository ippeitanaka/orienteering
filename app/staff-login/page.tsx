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
import { ArrowLeft, User, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StaffLoginPage() {
  const [name, setName] = useState("")
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [setupStatus, setSetupStatus] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo(null)

    try {
      console.log("Attempting staff login with:", { name, passcode })

      const response = await fetch("/api/staff/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, passcode }),
      })

      const data = await response.json()
      console.log("Staff login response:", data)

      if (!response.ok) {
        setError(data.error || "ログイン中にエラーが発生しました")
        if (data.debug) {
          setDebugInfo(data.debug)
        }
        setLoading(false)
        return
      }

      // ログイン成功時にローカルストレージにスタッフ情報を保存
      if (data.data) {
        localStorage.setItem("staffId", data.data.id.toString())
        localStorage.setItem("staffName", data.data.name)
        if (data.data.checkpoint_id) {
          localStorage.setItem("staffCheckpointId", data.data.checkpoint_id.toString())
        }
      }

      // スタッフダッシュボードにリダイレクト
      router.push("/staff-dashboard")
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン処理中にエラーが発生しました")
      setLoading(false)
    }
  }

  const handleSetup = async () => {
    setSetupStatus("処理中...")
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
      })

      const data = await response.json()
      setSetupStatus(data.message || "セットアップが完了しました")
    } catch (err) {
      console.error("Setup error:", err)
      setSetupStatus("セットアップ中にエラーが発生しました")
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
              <CardTitle className="text-center">スタッフログイン</CardTitle>
              <CardDescription className="text-center">
                スタッフ名とパスワードを入力してログインしてください
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    スタッフ名
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="スタッフ名を入力"
                    className="elt-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passcode" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    パスワード
                  </Label>
                  <Input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="パスワードを入力"
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

          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={handleSetup} className="w-full">
              初期データセットアップ
            </Button>
            {setupStatus && (
              <Alert className="mt-2">
                <AlertDescription>{setupStatus}</AlertDescription>
              </Alert>
            )}
          </div>

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

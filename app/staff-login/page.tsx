"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, User, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ThemeToggle from "@/components/theme-toggle"

export default function StaffLoginPage() {
  const [name, setName] = useState("")
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [setupStatus, setSetupStatus] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  // ページ読み込み時にセッションをチェック
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("ログインページでのセッションチェック開始")
        const response = await fetch("/api/staff/session")
        const data = await response.json()
        console.log("セッションチェック結果:", data)

        if (data.authenticated) {
          console.log("既に認証済みのため、ダッシュボードにリダイレクト")
          router.push("/staff-dashboard")
          return
        }
      } catch (err) {
        console.error("Session check error in login page:", err)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo(null)

    const normalizedName = name.trim()
    const normalizedPasscode = passcode.trim()

    if (!normalizedName || !normalizedPasscode) {
      setError("スタッフ名とパスワードを入力してください")
      setLoading(false)
      return
    }

    try {
      console.log("スタッフログイン試行:", { name: normalizedName, passcode: "***" })

      const response = await fetch("/api/staff/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: normalizedName, passcode: normalizedPasscode }),
      })

      const data = await response.json()
      console.log("ログインレスポンス:", data)

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
        console.log("ローカルストレージにスタッフ情報を保存:", {
          id: data.data.id,
          name: data.data.name,
        })
        localStorage.setItem("staffId", data.data.id.toString())
        localStorage.setItem("staffName", data.data.name)
        if (data.data.checkpoint_id) {
          localStorage.setItem("staffCheckpointId", data.data.checkpoint_id.toString())
        }
      }

      // 1秒待機してからリダイレクト（Cookieの設定を確実にするため）
      setTimeout(() => {
        console.log("スタッフダッシュボードにリダイレクト")
        router.push("/staff-dashboard")
      }, 1000)
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

  // セッションチェック中は読み込み表示
  if (checkingSession) {
    return (
      <div className="elt-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">セッションを確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="elt-bg min-h-screen">
      <div className="elt-container">
        <div className="max-w-md mx-auto">
          <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ホームに戻る
            </Link>
            <ThemeToggle />
          </div>

          <Card className="elt-card">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Image src="/images/elt-logo.png" alt="ELT 27周年記念ロゴ" width={120} height={72} className="elt-logo h-auto w-24 sm:w-[120px]" />
              </div>
              <CardTitle className="text-center text-xl sm:text-2xl">スタッフログイン</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base leading-6">
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
                    className="elt-input min-h-12 text-base"
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
                    className="elt-input min-h-12 text-base"
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
                <Button type="submit" className="elt-button w-full min-h-12 text-base font-bold" disabled={loading}>
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
            <Button variant="outline" size="sm" onClick={handleSetup} className="w-full min-h-11">
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

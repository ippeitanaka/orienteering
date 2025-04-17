"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function StaffLoginPage() {
  const router = useRouter()
  const [name, setName] = useState("") // 開発用の初期値
  const [passcode, setPasscode] = useState("") // 開発用の初期値
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      console.log("Submitting staff login:", { name, passcode })

      const response = await fetch("/api/staff/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, passcode }),
      })

      const data = await response.json()
      console.log("Staff login response:", data)

      if (data.success) {
        // ログイン成功時の処理
        localStorage.setItem("staffId", data.data.id)
        localStorage.setItem("staffName", data.data.name || "Staff")
        localStorage.setItem("staffCheckpointId", data.data.checkpoint_id || "")
        router.push("/staff-dashboard")
      } else {
        // エラー情報を表示
        setError(data.error || "ログインに失敗しました")
        setDebugInfo(data.debug || null)
      }
    } catch (err) {
      console.error("Error during staff login:", err)
      setError("ログイン処理中にエラーが発生しました")
      if (err instanceof Error) {
        setDebugInfo({ message: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>スタッフログイン</CardTitle>
          <CardDescription>スタッフ専用ページにアクセスするにはログインしてください</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                {debugInfo && (
                  <details className="mt-2 text-xs">
                    <summary>デバッグ情報</summary>
                    <pre className="mt-2 w-full max-h-40 overflow-auto bg-slate-950 text-slate-50 p-2 rounded text-xs">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                )}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">スタッフ名</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: ELT Staff"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passcode">パスワード</Label>
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="パスワードを入力"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

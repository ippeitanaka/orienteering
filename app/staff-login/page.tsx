"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Home, LogIn } from "lucide-react"
import { verifyStaff, supabase } from "@/lib/supabase"

export default function StaffLogin() {
  const [name, setName] = useState("")
  const [passcode, setPasscode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [configError, setConfigError] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    // クライアントサイドで環境変数を直接確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setConfigError(!supabaseUrl || !supabaseAnonKey)

    // デバッグ情報
    console.log("Client-side environment variables check:")
    console.log("NEXT_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl)
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey)
    console.log("NEXT_PUBLIC_SUPABASE_URL value:", supabaseUrl?.substring(0, 10) + "...")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo("")

    try {
      // デバッグ情報を追加
      console.log("Attempting login with:", { name, passcode })

      // テーブル構造を確認
      if (supabase) {
        try {
          const { data: tables } = await supabase
            .from("information_schema.tables")
            .select("table_name")
            .eq("table_schema", "public")
          console.log("Available tables:", tables)

          // staffテーブルのカラムを確認
          const { data: columns } = await supabase
            .from("information_schema.columns")
            .select("column_name, data_type")
            .eq("table_schema", "public")
            .eq("table_name", "staff")

          console.log("Staff table columns:", columns)
          setDebugInfo(`テーブル構造: ${JSON.stringify(columns)}`)
        } catch (err) {
          console.error("Error fetching schema:", err)
        }
      }

      const staff = await verifyStaff(name, passcode)
      console.log("Staff verification result:", staff)

      if (staff) {
        // スタッフ情報をローカルストレージに保存
        localStorage.setItem("staffId", staff.id.toString())
        router.push("/staff-dashboard")
      } else {
        setError("名前またはパスコードが正しくありません")
        setDebugInfo(
          (prevInfo) =>
            prevInfo +
            "\n\nスタッフ情報の検証に失敗しました。データベースにスタッフ情報が登録されているか確認してください。",
        )
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン中にエラーが発生しました")
      setDebugInfo(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen cute-bg flex flex-col">
      <header className="bg-primary/90 text-primary-foreground py-4 shadow-md relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-primary-foreground/10 flex items-center gap-1"
          onClick={handleGoHome}
        >
          <Home className="h-4 w-4" />
          <span>ホーム</span>
        </Button>
        <h1 className="text-2xl font-bold text-center font-heading">スタッフログイン</h1>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md cute-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="text-center text-primary font-heading">スタッフログイン</CardTitle>
            <CardDescription className="text-center">
              スタッフ専用機能にアクセスするにはログインしてください
            </CardDescription>
          </CardHeader>

          {configError && (
            <div className="px-6">
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>設定エラー</AlertTitle>
                <AlertDescription>
                  <p>Supabaseの環境変数が設定されていません。以下の環境変数を設定してください：</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>NEXT_PUBLIC_SUPABASE_URL</li>
                    <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">
                  名前
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="cute-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passcode" className="font-medium">
                  パスコード
                </Label>
                <Input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="cute-input"
                />
              </div>
              {error && <div className="text-destructive text-sm font-medium">{error}</div>}
              {debugInfo && (
                <Alert variant="default" className="mt-4 rounded-xl">
                  <AlertTitle>デバッグ情報</AlertTitle>
                  <AlertDescription>
                    <p className="text-xs break-all whitespace-pre-wrap">{debugInfo}</p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full cute-button" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                    ログイン中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    ログイン
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-primary/30 hover:bg-primary/10"
                onClick={handleGoHome}
              >
                ホームに戻る
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>

      <footer className="bg-muted py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} ELT学外オリエンテーション</p>
        </div>
      </footer>
    </div>
  )
}

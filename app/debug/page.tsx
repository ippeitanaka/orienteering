"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "error">("checking")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    // 環境変数の情報を収集
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5) + "...",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }
    setEnvVars(vars)

    // Supabase接続テスト
    async function testSupabaseConnection() {
      try {
        if (!supabase) {
          setSupabaseStatus("error")
          setErrorMessage("Supabaseクライアントが初期化されていません")
          return
        }

        const { data, error } = await supabase.from("teams").select("count").single()

        if (error) {
          setSupabaseStatus("error")
          setErrorMessage(`Supabase接続エラー: ${error.message}`)
        } else {
          setSupabaseStatus("connected")
        }
      } catch (err) {
        setSupabaseStatus("error")
        setErrorMessage(`予期せぬエラー: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    testSupabaseConnection()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 text-center">
        <h1 className="text-2xl font-bold">デバッグ情報</h1>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>環境変数</CardTitle>
            <CardDescription>アプリケーションで利用可能な環境変数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-muted rounded-md">
                  <span className="font-mono">{key}</span>
                  <span className="font-mono text-sm">{value || "未設定"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Supabase接続ステータス</CardTitle>
            <CardDescription>Supabaseへの接続状態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className={`w-4 h-4 rounded-full ${
                  supabaseStatus === "checking"
                    ? "bg-yellow-500"
                    : supabaseStatus === "connected"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span>
                {supabaseStatus === "checking"
                  ? "確認中..."
                  : supabaseStatus === "connected"
                    ? "接続済み"
                    : "接続エラー"}
              </span>
            </div>
            {supabaseStatus === "error" && <p className="text-destructive mt-2">{errorMessage}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={() => (window.location.href = "/")}>ホームに戻る</Button>
        </div>
      </main>

      <footer className="bg-muted p-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
      </footer>
    </div>
  )
}

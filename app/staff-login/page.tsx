"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function StaffLoginPage() {
  const [name, setName] = useState("")
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [setupMessage, setSetupMessage] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDebugInfo(null)
    setIsLoading(true)

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
      setIsLoading(false)
    }
  }

  const handleSetup = async () => {
    setSetupMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/setup")
      const data = await response.json()

      if (data.success) {
        setSetupMessage(`セットアップ成功: ${data.message}`)
      } else {
        setSetupMessage(`セットアップ失敗: ${data.error}`)
      }
    } catch (err) {
      setSetupMessage("セットアップ中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">スタッフログイン</h1>
          <p className="mt-2 text-gray-600">続行するにはログインしてください</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-md">
            <p className="font-medium">{error}</p>
            {debugInfo && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">デバッグ情報</summary>
                <pre className="mt-2 w-full max-h-40 overflow-auto bg-slate-950 text-slate-50 p-2 rounded text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {setupMessage && (
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md">
            <p>{setupMessage}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                スタッフ名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="スタッフ名を入力"
              />
            </div>
            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="passcode"
                name="passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="パスワードを入力"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </div>
        </form>

        <div className="flex justify-between items-center mt-4">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
            トップページに戻る
          </Link>
          <button onClick={handleSetup} disabled={isLoading} className="text-sm text-green-600 hover:text-green-800">
            初期データセットアップ
          </button>
        </div>

        <div className="text-center mt-4 text-sm text-gray-500">
          <p>緊急用ログイン: admin / admin123</p>
          <p className="mt-1">または elt10 / elt10 など</p>
        </div>
      </div>
    </div>
  )
}

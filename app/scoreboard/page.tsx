"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Scoreboard } from "@/components/scoreboard"

export default function ScoreboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // データ読み込みの模擬
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">スコアボード</h1>
        <p className="text-gray-600 dark:text-gray-300">各チームの現在のスコアとランキング</p>
      </header>

      <div className="max-w-4xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">チームランキング</CardTitle>
          </CardHeader>
          <CardContent>
            <Scoreboard />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Link href="/">
          <Button variant="outline">ホームに戻る</Button>
        </Link>
      </div>
    </div>
  )
}

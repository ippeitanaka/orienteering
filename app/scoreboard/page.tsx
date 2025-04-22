"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
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
    <div className="elt-bg min-h-screen">
      <div className="elt-container">
        <header className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <Image src="/images/elt-logo.png" alt="ELT 26周年記念ロゴ" width={150} height={90} className="elt-logo" />
          </div>
          <h1 className="text-3xl font-bold mb-2">スコアボード</h1>
          <p className="text-muted-foreground">各チームの現在のスコアとランキング</p>
        </header>

        <div className="max-w-4xl mx-auto mb-8">
          <Card className="elt-card">
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

        <footer className="elt-footer text-center mt-12">
          <p>© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
        </footer>
      </div>
    </div>
  )
}

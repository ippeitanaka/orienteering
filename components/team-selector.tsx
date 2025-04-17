"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Hash, LogIn } from "lucide-react"
import type { Team } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TeamSelectorProps {
  teams: Team[]
  onSelect: (team: Team) => void
}

export default function TeamSelector({ teams, onSelect }: TeamSelectorProps) {
  const [teamCode, setTeamCode] = useState("")
  const [error, setError] = useState("")

  const handleTeamCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 入力されたコードでチームを検索
    // まず、team_codeフィールドで検索
    let team = teams.find((t) => t.team_code === teamCode)

    // 見つからなければ、IDで検索（後方互換性のため）
    if (!team) {
      const teamId = Number.parseInt(teamCode)
      if (!isNaN(teamId)) {
        team = teams.find((t) => t.id === teamId)
      }
    }

    if (!team) {
      setError("チームが見つかりません。正しいチームコードを入力してください。")
      return
    }

    onSelect(team)
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-primary/10 border-primary/20">
        <AlertDescription>
          チームコードを入力してログインしてください。チームコードはスタッフから提供されます。
        </AlertDescription>
      </Alert>

      <form onSubmit={handleTeamCodeSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamCode" className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            チームコード
          </Label>
          <Input
            id="teamCode"
            placeholder="チームコードを入力"
            value={teamCode}
            onChange={(e) => {
              setTeamCode(e.target.value)
              setError("")
            }}
            className="cute-input"
          />
        </div>
        {error && <p className="text-destructive text-sm animate-pulse-soft">{error}</p>}
        <Button type="submit" className="w-full cute-button flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          ログイン
        </Button>
      </form>
    </div>
  )
}

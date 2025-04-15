"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getContrastColor } from "@/lib/utils"
import type { Team } from "@/lib/supabase"
import { Users, Hash, LogIn } from "lucide-react"

interface TeamSelectorProps {
  teams: Team[]
  onSelect: (team: Team) => void
}

export default function TeamSelector({ teams, onSelect }: TeamSelectorProps) {
  const [teamCode, setTeamCode] = useState("")
  const [error, setError] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)

  const handleTeamSelect = (team: Team) => {
    setSelectedTeamId(team.id)
    setTimeout(() => {
      onSelect(team)
    }, 300) // アニメーションに合わせて少し遅延
  }

  const handleTeamCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const teamId = Number.parseInt(teamCode)

    if (isNaN(teamId)) {
      setError("有効なチームコードを入力してください。")
      return
    }

    const team = teams.find((t) => t.id === teamId)
    if (!team) {
      setError("チームが見つかりません。")
      return
    }

    handleTeamSelect(team)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-primary">チームを選択</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {teams.map((team) => (
            <Button
              key={team.id}
              className={`h-20 flex flex-col items-center justify-center transition-all ${
                selectedTeamId === team.id ? "animate-pop scale-105 shadow-lg" : "hover:scale-105"
              }`}
              style={{
                backgroundColor: team.color,
                color: getContrastColor(team.color),
              }}
              onClick={() => handleTeamSelect(team)}
            >
              <span className="font-bold text-lg">{team.name}</span>
              <span className="text-xs opacity-80 mt-1">チームID: {team.id}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">または</span>
        </div>
      </div>

      <form onSubmit={handleTeamCodeSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamCode" className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
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

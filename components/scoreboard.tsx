"use client"

import { useState, useEffect } from "react"
import { getTeams, type Team, getCheckpoints, getTeamCheckins } from "@/lib/supabase"
import { getContrastColor } from "@/lib/utils"
import { Trophy, CheckCircle } from "lucide-react"

export default function Scoreboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [teamProgress, setTeamProgress] = useState<Record<number, number>>({})
  const [totalCheckpoints, setTotalCheckpoints] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData)

        const checkpointsData = await getCheckpoints()
        setTotalCheckpoints(checkpointsData.length)

        // 各チームの進捗状況を取得
        const progressData: Record<number, number> = {}
        for (const team of teamsData) {
          const checkins = await getTeamCheckins(team.id)
          progressData[team.id] = checkins.length
        }
        setTeamProgress(progressData)

        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch scoreboard data:", err)
        setLoading(false)
      }
    }

    fetchData()

    // 30秒ごとにデータを更新
    const interval = setInterval(async () => {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData)

        // 各チームの進捗状況を更新
        const progressData: Record<number, number> = {}
        for (const team of teamsData) {
          const checkins = await getTeamCheckins(team.id)
          progressData[team.id] = checkins.length
        }
        setTeamProgress(progressData)
      } catch (err) {
        console.error("Failed to update scoreboard data:", err)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">スコアボードを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 slide-in">
      <div className="text-center mb-8">
        <Trophy className="h-10 w-10 text-accent mx-auto mb-3 animate-pulse-soft" />
        <h2 className="text-2xl font-bold font-heading text-primary">ランキング</h2>
        <p className="text-muted-foreground">チームの進捗状況とスコア</p>
      </div>

      <div className="space-y-4">
        {teams.map((team, index) => (
          <div
            key={team.id}
            className="flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow slide-in"
            style={{
              backgroundColor: `${team.color}10`,
              borderLeft: `4px solid ${team.color}`,
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-lg"
                style={{ color: team.color }}
              >
                {index + 1}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                <div className="font-medium text-lg">{team.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm flex gap-2 items-center">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span>
                  {teamProgress[team.id] || 0}/{totalCheckpoints}
                </span>
              </div>
              <div
                className="font-bold px-4 py-2 rounded-xl text-sm min-w-[4rem] text-center shadow-sm"
                style={{
                  backgroundColor: team.color,
                  color: getContrastColor(team.color),
                }}
              >
                {team.total_score}点
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">30秒ごとに自動更新されます</div>
    </div>
  )
}

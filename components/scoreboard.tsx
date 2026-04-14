"use client"

import { useEffect, useRef, useState } from "react"
import { getTeams, type Team, getCheckpoints, getTeamCheckins } from "@/lib/supabase"
import { getContrastColor } from "@/lib/utils"
import { Trophy, CheckCircle, Sparkles, TrendingUp } from "lucide-react"

export function Scoreboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [teamProgress, setTeamProgress] = useState<Record<number, number>>({})
  const [totalCheckpoints, setTotalCheckpoints] = useState(0)
  const [rankChanges, setRankChanges] = useState<Record<number, number>>({})
  const [scoreDiffs, setScoreDiffs] = useState<Record<number, number>>({})
  const [leadMessage, setLeadMessage] = useState<string | null>(null)
  const previousRanksRef = useRef<Record<number, number>>({})
  const previousScoresRef = useRef<Record<number, number>>({})
  const leadMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const applyScoreboardData = async (teamsData: Team[], initialLoad = false) => {
    setTeams(teamsData)

    const progressData: Record<number, number> = {}
    for (const team of teamsData) {
      const checkins = await getTeamCheckins(team.id)
      progressData[team.id] = checkins.length
    }
    setTeamProgress(progressData)

    const nextRanks: Record<number, number> = {}
    const nextRankChanges: Record<number, number> = {}
    const nextScoreDiffs: Record<number, number> = {}

    teamsData.forEach((team, index) => {
      const nextRank = index + 1
      nextRanks[team.id] = nextRank

      const previousRank = previousRanksRef.current[team.id]
      if (!initialLoad && previousRank && previousRank !== nextRank) {
        nextRankChanges[team.id] = previousRank - nextRank
      }

      const previousScore = previousScoresRef.current[team.id]
      if (!initialLoad && previousScore !== undefined && previousScore !== team.total_score) {
        nextScoreDiffs[team.id] = team.total_score - previousScore
      }
    })

    const previousLeaderId = Object.entries(previousRanksRef.current).find(([, rank]) => rank === 1)?.[0]
    if (!initialLoad && previousLeaderId && teamsData[0] && Number(previousLeaderId) !== teamsData[0].id) {
      setLeadMessage(`${teamsData[0].name} が首位に浮上しました`)

      if (leadMessageTimeoutRef.current) {
        clearTimeout(leadMessageTimeoutRef.current)
      }

      leadMessageTimeoutRef.current = setTimeout(() => {
        setLeadMessage(null)
      }, 6000)
    }

    previousRanksRef.current = nextRanks
    previousScoresRef.current = Object.fromEntries(teamsData.map((team) => [team.id, team.total_score]))
    setRankChanges(nextRankChanges)
    setScoreDiffs(nextScoreDiffs)
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const teamsData = await getTeams()

        const checkpointsData = await getCheckpoints()
        setTotalCheckpoints(checkpointsData.length)

        await applyScoreboardData(teamsData, true)

        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch scoreboard data:", err)
        setLoading(false)
      }
    }

    fetchData()

    // 5秒ごとにデータを更新
    const interval = setInterval(async () => {
      try {
        const teamsData = await getTeams()
        await applyScoreboardData(teamsData)
      } catch (err) {
        console.error("Failed to update scoreboard data:", err)
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      if (leadMessageTimeoutRef.current) {
        clearTimeout(leadMessageTimeoutRef.current)
      }
    }
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
      {leadMessage ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 px-4 py-3 text-center text-sm font-semibold text-amber-950 shadow-lg animate-scoreboard-flash">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{leadMessage}</span>
          </div>
        </div>
      ) : null}

      <div className="text-center mb-8">
        <Trophy className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse-slow" />
        <h2 className="text-2xl font-bold font-heading">ランキング</h2>
        <p className="text-muted-foreground">チームの進捗状況とスコア</p>
      </div>

      <div className="space-y-4">
        {teams.map((team, index) => (
          <div
            key={team.id}
            className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-500 hover:bg-accent/30 slide-in ${rankChanges[team.id] ? "animate-rank-rise border-amber-300 bg-amber-50/80 shadow-lg" : "border-border/60"}`}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center font-bold text-lg">
                {index + 1}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: team.color }}></div>
                <div className="font-medium text-lg">{team.name}</div>
                {rankChanges[team.id] ? (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                    <TrendingUp className="h-3 w-3" />
                    {rankChanges[team.id] > 0 ? `+${rankChanges[team.id]}` : rankChanges[team.id]}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm flex gap-2 items-center">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>
                  {teamProgress[team.id] || 0}/{totalCheckpoints}
                </span>
              </div>
              <div
                className="font-bold px-4 py-2 rounded-sm text-sm min-w-[4rem] text-center"
                style={{
                  backgroundColor: team.color,
                  color: getContrastColor(team.color),
                }}
              >
                {team.total_score}点
              </div>
              {scoreDiffs[team.id] ? (
                <div className="min-w-[4rem] rounded-full bg-emerald-600 px-3 py-1 text-center text-xs font-bold text-white animate-score-pop">
                  {scoreDiffs[team.id] > 0 ? `+${scoreDiffs[team.id]}` : scoreDiffs[team.id]}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">5秒ごとに自動更新されます</div>
    </div>
  )
}

export default Scoreboard

import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const toPointValue = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const [teamsResult, checkpointsResult, checkinsResult, timerResult, staffResult] = await Promise.all([
      supabaseServer.from("teams").select("*").order("total_score", { ascending: false }),
      supabaseServer.from("checkpoints").select("*"),
      supabaseServer.from("checkins").select("*").order("created_at", { ascending: true }),
      supabaseServer.from("timer_settings").select("*").order("created_at", { ascending: false }).limit(1),
      supabaseServer.from("staff").select("id, name, checkpoint_id"),
    ])

    if (teamsResult.error || checkpointsResult.error || checkinsResult.error) {
      const error = teamsResult.error || checkpointsResult.error || checkinsResult.error
      return NextResponse.json({ error: error?.message || "Failed to generate report" }, { status: 500 })
    }

    const teams = teamsResult.data || []
    const checkpoints = checkpointsResult.data || []
    const checkins = checkinsResult.data || []
    const timer = timerResult.data?.[0] || null
    const staffMembers = staffResult.data || []

    const checkpointMap = new Map(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]))
    const assignedStaffByCheckpoint = new Map<number, string>()
    for (const staff of staffMembers) {
      if (staff.checkpoint_id) {
        assignedStaffByCheckpoint.set(staff.checkpoint_id, staff.name)
      }
    }

    const checkinsByTeam = new Map<number, any[]>()
    const checkinsByCheckpoint = new Map<number, any[]>()

    for (const checkin of checkins) {
      const teamCheckins = checkinsByTeam.get(checkin.team_id) || []
      teamCheckins.push(checkin)
      checkinsByTeam.set(checkin.team_id, teamCheckins)

      const checkpointCheckins = checkinsByCheckpoint.get(checkin.checkpoint_id) || []
      checkpointCheckins.push(checkin)
      checkinsByCheckpoint.set(checkin.checkpoint_id, checkpointCheckins)
    }

    const teamRows = [...teams]
      .sort((left, right) => {
        if (right.total_score !== left.total_score) {
          return right.total_score - left.total_score
        }

        return (checkinsByTeam.get(right.id)?.length || 0) - (checkinsByTeam.get(left.id)?.length || 0)
      })
      .map((team, index) => {
        const teamCheckins = checkinsByTeam.get(team.id) || []
        const visitedNames = teamCheckins
          .map((checkin) => checkpointMap.get(checkin.checkpoint_id)?.name)
          .filter(Boolean) as string[]

        return {
          rank: index + 1,
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          score: team.total_score,
          checkins: teamCheckins.length,
          checkpointsVisited: visitedNames,
          firstCheckinAt: teamCheckins[0]?.created_at || null,
          lastCheckinAt: teamCheckins[teamCheckins.length - 1]?.created_at || null,
        }
      })

    const checkpointRows = checkpoints.map((checkpoint) => {
      const checkpointCheckins = checkinsByCheckpoint.get(checkpoint.id) || []
      const uniqueTeams = new Set(checkpointCheckins.map((checkin) => checkin.team_id)).size

      return {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        pointValue: toPointValue(checkpoint.point_value),
        visits: checkpointCheckins.length,
        uniqueTeams,
        isMoving: assignedStaffByCheckpoint.has(checkpoint.id),
        assignedStaffName: assignedStaffByCheckpoint.get(checkpoint.id) || null,
      }
    })

    const now = new Date()
    const timerEnd = timer?.end_time ? new Date(timer.end_time) : null
    const eventStatus = timer?.is_running ? "running" : timerEnd && timerEnd < now ? "finished" : "not_started"

    const summary = {
      generatedAt: now.toISOString(),
      eventStatus,
      timer,
      totalTeams: teams.length,
      totalCheckpoints: checkpoints.length,
      totalCheckins: checkins.length,
      movingCheckpointCount: checkpointRows.filter((checkpoint) => checkpoint.isMoving).length,
      averageCheckinsPerTeam: teams.length > 0 ? Number((checkins.length / teams.length).toFixed(1)) : 0,
      topTeamName: teamRows[0]?.teamName || null,
      topScore: teamRows[0]?.score || 0,
      lastCheckinAt: checkins[checkins.length - 1]?.created_at || null,
    }

    return NextResponse.json({
      data: {
        summary,
        teams: teamRows,
        checkpoints: checkpointRows.sort((left, right) => right.visits - left.visits),
      },
    })
  } catch (error) {
    console.error("Error in GET /api/reports/event-summary:", error)
    return NextResponse.json({ error: "Failed to generate event report" }, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

const DEFAULT_TIMER_DURATION = 3600

type ResetTargetKey = "scores" | "checkins" | "teamLocations" | "movingCheckpoints" | "timer"

interface ResetTargets {
  scores?: boolean
  checkins?: boolean
  teamLocations?: boolean
  movingCheckpoints?: boolean
  timer?: boolean
}

async function isStaffAuthenticated() {
  const cookieStore = await cookies()
  const staffSession = cookieStore.get("staff_session")
  const staffId = cookieStore.get("staff_id")
  const staffName = cookieStore.get("staff_name")

  if (staffSession?.value) {
    try {
      const session = JSON.parse(staffSession.value)
      if (session?.staff_id) {
        return true
      }
    } catch (error) {
      console.error("Failed to parse staff session during reset:", error)
    }
  }

  return Boolean(staffId?.value && staffName?.value)
}

export async function POST(request: Request) {
  try {
    if (!(await isStaffAuthenticated())) {
      return NextResponse.json({ error: "スタッフ認証が必要です", success: false }, { status: 401 })
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available", success: false }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedTargets: ResetTargets = body?.targets || {}
    const normalizedTargets: Record<ResetTargetKey, boolean> = {
      scores: requestedTargets.scores !== false,
      checkins: requestedTargets.checkins !== false,
      teamLocations: requestedTargets.teamLocations !== false,
      movingCheckpoints: requestedTargets.movingCheckpoints !== false,
      timer: requestedTargets.timer !== false,
    }

    const enabledTargets = Object.entries(normalizedTargets)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as ResetTargetKey)

    if (enabledTargets.length === 0) {
      return NextResponse.json({ error: "リセット対象を1つ以上選択してください", success: false }, { status: 400 })
    }

    const resetTimestamp = new Date().toISOString()
    const operations = []

    if (normalizedTargets.checkins) {
      operations.push(supabaseServer.from("checkins").delete().neq("id", 0))
    }

    if (normalizedTargets.teamLocations) {
      operations.push(supabaseServer.from("team_locations").delete().neq("id", 0))
      operations.push(supabaseServer.from("team_location_locks").delete().neq("team_id", 0))
    }

    if (normalizedTargets.movingCheckpoints) {
      operations.push(supabaseServer.from("staff_locations").delete().neq("id", 0))
    }

    if (normalizedTargets.scores) {
      operations.push(supabaseServer.from("teams").update({ total_score: 0 }).neq("id", 0))
    }

    if (normalizedTargets.timer) {
      operations.push(
        supabaseServer
          .from("timer_settings")
          .update({
            duration: DEFAULT_TIMER_DURATION,
            end_time: null,
            is_running: false,
            updated_at: resetTimestamp,
          })
          .neq("id", 0),
      )
    }

    const results = await Promise.all(operations)

    const operationError = results.find((result) => result.error)?.error

    if (operationError) {
      console.error("Error resetting game data:", operationError)
      return NextResponse.json({ error: operationError.message, success: false }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "選択したゲームデータをリセットしました",
      resetTargets: enabledTargets,
    })
  } catch (error) {
    console.error("Error in POST /api/reset-game:", error)
    return NextResponse.json(
      {
        error: "Failed to reset game data",
        success: false,
      },
      { status: 500 },
    )
  }
}
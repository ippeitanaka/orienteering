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

const isMissingTableError = (error: { code?: string; message?: string } | null, tableName: string) => {
  if (!error) {
    return false
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes(tableName.toLowerCase()))
  )
}

const updateTimerState = async (resetTimestamp: string) => {
  const existingTimerResult = await supabaseServer
    .from("timer_settings")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)

  if (existingTimerResult.error) {
    return existingTimerResult
  }

  if (!existingTimerResult.data || existingTimerResult.data.length === 0) {
    return await supabaseServer.from("timer_settings").insert([
      {
        duration: DEFAULT_TIMER_DURATION,
        end_time: null,
        is_running: false,
        updated_at: resetTimestamp,
      },
    ])
  }

  return await supabaseServer
    .from("timer_settings")
    .update({
      duration: DEFAULT_TIMER_DURATION,
      end_time: null,
      is_running: false,
      updated_at: resetTimestamp,
    })
    .eq("id", existingTimerResult.data[0].id)
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
    const completedTargets: string[] = []
    const skippedTargets: string[] = []

    if (normalizedTargets.checkins) {
      const result = await supabaseServer.from("checkins").delete().neq("id", 0)
      if (result.error) {
        if (isMissingTableError(result.error, "checkins")) {
          skippedTargets.push("チェックイン履歴")
        } else {
          console.error("Error resetting checkins:", result.error)
          return NextResponse.json({ error: `チェックイン履歴のリセットに失敗しました: ${result.error.message}`, success: false }, { status: 500 })
        }
      } else {
        completedTargets.push("チェックイン履歴")
      }
    }

    if (normalizedTargets.teamLocations) {
      const teamLocationsResult = await supabaseServer.from("team_locations").delete().neq("id", 0)
      if (teamLocationsResult.error && !isMissingTableError(teamLocationsResult.error, "team_locations")) {
        console.error("Error resetting team_locations:", teamLocationsResult.error)
        return NextResponse.json(
          { error: `チーム GPS 履歴のリセットに失敗しました: ${teamLocationsResult.error.message}`, success: false },
          { status: 500 },
        )
      }

      const teamLocationLocksResult = await supabaseServer.from("team_location_locks").delete().neq("team_id", 0)
      if (teamLocationLocksResult.error && !isMissingTableError(teamLocationLocksResult.error, "team_location_locks")) {
        console.error("Error resetting team_location_locks:", teamLocationLocksResult.error)
        return NextResponse.json(
          { error: `チーム位置共有ロックのリセットに失敗しました: ${teamLocationLocksResult.error.message}`, success: false },
          { status: 500 },
        )
      }

      if (teamLocationsResult.error && teamLocationLocksResult.error) {
        skippedTargets.push("チーム GPS 履歴")
      } else {
        completedTargets.push("チーム GPS 履歴")
      }
    }

    if (normalizedTargets.movingCheckpoints) {
      const result = await supabaseServer.from("staff_locations").delete().neq("id", 0)
      if (result.error) {
        if (isMissingTableError(result.error, "staff_locations")) {
          skippedTargets.push("移動チェックポイント位置")
        } else {
          console.error("Error resetting staff_locations:", result.error)
          return NextResponse.json(
            { error: `移動チェックポイント位置のリセットに失敗しました: ${result.error.message}`, success: false },
            { status: 500 },
          )
        }
      } else {
        completedTargets.push("移動チェックポイント位置")
      }
    }

    if (normalizedTargets.scores) {
      const result = await supabaseServer.from("teams").update({ total_score: 0 }).neq("id", 0)
      if (result.error) {
        if (isMissingTableError(result.error, "teams")) {
          skippedTargets.push("チーム得点")
        } else {
          console.error("Error resetting teams scores:", result.error)
          return NextResponse.json({ error: `チーム得点のリセットに失敗しました: ${result.error.message}`, success: false }, { status: 500 })
        }
      } else {
        completedTargets.push("チーム得点")
      }
    }

    if (normalizedTargets.timer) {
      const result = await updateTimerState(resetTimestamp)
      if (result.error) {
        if (isMissingTableError(result.error, "timer_settings")) {
          skippedTargets.push("タイマー状態")
        } else {
          console.error("Error resetting timer:", result.error)
          return NextResponse.json({ error: `タイマー状態のリセットに失敗しました: ${result.error.message}`, success: false }, { status: 500 })
        }
      } else {
        completedTargets.push("タイマー状態")
      }
    }

    const messageParts = []
    if (completedTargets.length > 0) {
      messageParts.push(`リセット完了: ${completedTargets.join("、")}`)
    }
    if (skippedTargets.length > 0) {
      messageParts.push(`未作成テーブルのためスキップ: ${skippedTargets.join("、")}`)
    }

    return NextResponse.json({
      success: true,
      message: messageParts.join(" / ") || "選択したゲームデータをリセットしました",
      resetTargets: enabledTargets,
      completedTargets,
      skippedTargets,
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
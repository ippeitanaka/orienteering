import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

const FINISH_CHECKPOINT_ID = 1

const normalizePointValue = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

const isMissingQrTokenColumn = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("qr_token"))
  )
}

const isMissingRpcFunction = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("team_checkpoint_checkin"))
  )
}

const shouldFallbackFromRpcError = (error: { code?: string; details?: string | null; message?: string } | null) => {
  if (!error) return false
  if (isMissingRpcFunction(error)) return true

  const details = typeof error.details === "string" ? error.details.toLowerCase() : ""
  const message = typeof error.message === "string" ? error.message.toLowerCase() : ""

  return error.code === "42702" && (details.includes("total_score") || message.includes('"total_score" is ambiguous'))
}

const getLatestTimerSettings = async () => {
  if (!supabaseServer) {
    return { data: null, error: new Error("Database connection not available") }
  }

  const result = await supabaseServer
    .from("timer_settings")
    .select("duration, end_time, is_running")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const tableMissing =
    result.error?.code === "42P01" ||
    result.error?.code === "PGRST205" ||
    (typeof result.error?.message === "string" && result.error.message.includes("timer_settings"))

  if (tableMissing) {
    return { data: null, error: null }
  }

  return result
}

const getFinishProgressRatio = async (teamId: number) => {
  if (!supabaseServer) {
    return { ratio: 1, completedCount: 0, totalCount: 0, error: new Error("Database connection not available") }
  }

  const [checkpointResult, checkinResult] = await Promise.all([
    supabaseServer.from("checkpoints").select("id, is_checkpoint").neq("id", FINISH_CHECKPOINT_ID),
    supabaseServer.from("checkins").select("checkpoint_id").eq("team_id", teamId).neq("checkpoint_id", FINISH_CHECKPOINT_ID),
  ])

  if (checkpointResult.error) {
    return { ratio: 1, completedCount: 0, totalCount: 0, error: checkpointResult.error }
  }

  if (checkinResult.error) {
    return { ratio: 1, completedCount: 0, totalCount: 0, error: checkinResult.error }
  }

  const activeCheckpointIds = new Set(
    (checkpointResult.data || []).filter((checkpoint) => checkpoint.is_checkpoint !== false).map((checkpoint) => checkpoint.id),
  )

  const totalCount = activeCheckpointIds.size
  if (totalCount === 0) {
    return { ratio: 1, completedCount: 0, totalCount: 0, error: null }
  }

  const completedCount = new Set(
    (checkinResult.data || []).map((checkin) => checkin.checkpoint_id).filter((checkpointId) => activeCheckpointIds.has(checkpointId)),
  ).size

  return {
    ratio: completedCount / totalCount,
    completedCount,
    totalCount,
    error: null,
  }
}

const calculateFinishTimeAdjustment = async (teamId: number) => {
  const { data, error } = await getLatestTimerSettings()

  if (error) {
    return { points: 0, message: null, error, ratio: 1, completedCount: 0, totalCount: 0 }
  }

  if (!data?.end_time) {
    return { points: 0, message: null, error: null, ratio: 1, completedCount: 0, totalCount: 0 }
  }

  const progress = await getFinishProgressRatio(teamId)
  if (progress.error) {
    return {
      points: 0,
      message: null,
      error: progress.error,
      ratio: progress.ratio,
      completedCount: progress.completedCount,
      totalCount: progress.totalCount,
    }
  }

  const diffSeconds = Math.floor((new Date(data.end_time).getTime() - Date.now()) / 1000)

  if (diffSeconds >= 0) {
    const rawBonusPoints = Math.floor(diffSeconds / 60)
    const scaledBonusPoints = Math.floor(rawBonusPoints * progress.ratio)
    return {
      points: scaledBonusPoints,
      message:
        rawBonusPoints > 0
          ? `残り時間ボーナス ${scaledBonusPoints}ポイント（${progress.completedCount}/${progress.totalCount}達成）`
          : null,
      error: null,
      ratio: progress.ratio,
      completedCount: progress.completedCount,
      totalCount: progress.totalCount,
    }
  }

  const penaltyMinutes = Math.ceil(Math.abs(diffSeconds) / 60)
  const penaltyPoints = penaltyMinutes * 2

  return {
    points: -penaltyPoints,
    message: `時間超過により ${penaltyPoints}ポイント減算`,
    error: null,
    ratio: progress.ratio,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
  }
}

const resolveCheckpointByToken = async (token: string) => {
  if (!supabaseServer) {
    return { data: null, error: new Error("Database connection not available") }
  }

  let checkpoint: any = null
  const qrResult = await supabaseServer.from("checkpoints").select("*").eq("qr_token", token).limit(1).maybeSingle()

  if (qrResult.error && !isMissingQrTokenColumn(qrResult.error)) {
    return { data: null, error: qrResult.error }
  }

  if (!qrResult.error) {
    checkpoint = qrResult.data
  }

  if (!checkpoint && /^\d+$/.test(token)) {
    const idResult = await supabaseServer
      .from("checkpoints")
      .select("*")
      .eq("id", Number.parseInt(token, 10))
      .limit(1)
      .maybeSingle()

    if (idResult.error) {
      return { data: null, error: idResult.error }
    }

    checkpoint = idResult.data
  }

  return { data: checkpoint, error: null }
}

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("team_session")

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "チームログインが必要です" }, { status: 401 })
    }

    let session: { team_id?: number; device_id?: string | null } | null = null
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json({ error: "セッション情報を解析できませんでした" }, { status: 401 })
    }

    const teamId = session?.team_id
    if (!teamId) {
      return NextResponse.json({ error: "有効なチームセッションではありません" }, { status: 401 })
    }

    const body = await request.json()
    const token = typeof body.token === "string" ? body.token : ""

    if (!token) {
      return NextResponse.json({ error: "チェックポイント識別子が必要です" }, { status: 400 })
    }

    const [{ data: team, error: teamError }, checkpointResult] = await Promise.all([
      supabaseServer.from("teams").select("id, name, total_score").eq("id", teamId).single(),
      resolveCheckpointByToken(token),
    ])

    if (teamError || !team) {
      return NextResponse.json({ error: "チームが見つかりません" }, { status: 404 })
    }

    if (checkpointResult.error) {
      console.error("Error resolving checkpoint token:", checkpointResult.error)
      return NextResponse.json({ error: "チェックポイントの取得に失敗しました" }, { status: 500 })
    }

    const checkpoint = checkpointResult.data
    if (!checkpoint) {
      return NextResponse.json({ error: "チェックポイントが見つかりません" }, { status: 404 })
    }

    if (checkpoint.id === FINISH_CHECKPOINT_ID) {
      const existingCheckin = await supabaseServer
        .from("checkins")
        .select("id")
        .eq("team_id", team.id)
        .eq("checkpoint_id", checkpoint.id)
        .maybeSingle()

      if (existingCheckin.error && existingCheckin.error.code !== "PGRST116") {
        console.error("Error checking finish checkpoint state:", existingCheckin.error)
        return NextResponse.json({ error: "ゴール判定の確認に失敗しました" }, { status: 500 })
      }

      if (existingCheckin.data) {
        return NextResponse.json(
          {
            success: false,
            alreadyCheckedIn: true,
            checkpoint: { id: checkpoint.id, name: checkpoint.name },
            team: { id: team.id, name: team.name, total_score: team.total_score },
            message: "このチームはすでにゴール済みです",
          },
          { status: 409 },
        )
      }

      const timeAdjustment = await calculateFinishTimeAdjustment(team.id)
      if (timeAdjustment.error) {
        console.error("Error calculating finish time adjustment:", timeAdjustment.error)
        return NextResponse.json({ error: "タイムポイントの計算に失敗しました" }, { status: 500 })
      }

      const insertCheckin = await supabaseServer.from("checkins").insert([{ team_id: team.id, checkpoint_id: checkpoint.id }])

      if (insertCheckin.error) {
        if (insertCheckin.error.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              alreadyCheckedIn: true,
              checkpoint: { id: checkpoint.id, name: checkpoint.name },
              team: { id: team.id, name: team.name, total_score: team.total_score },
              message: "このチームはすでにゴール済みです",
            },
            { status: 409 },
          )
        }

        console.error("Error inserting finish checkin:", insertCheckin.error)
        return NextResponse.json({ error: "ゴール登録に失敗しました" }, { status: 500 })
      }

      const checkpointPoints = normalizePointValue(checkpoint.point_value)
      const totalAwardedPoints = checkpointPoints + timeAdjustment.points
      const updatedScore = (team.total_score || 0) + totalAwardedPoints
      const updateScore = await supabaseServer.from("teams").update({ total_score: updatedScore }).eq("id", team.id)

      if (updateScore.error) {
        await supabaseServer.from("checkins").delete().eq("team_id", team.id).eq("checkpoint_id", checkpoint.id)
        console.error("Error updating finish score:", updateScore.error)
        return NextResponse.json({ error: "ゴール時のポイント更新に失敗しました" }, { status: 500 })
      }

      const messageParts = [`${checkpointPoints}ポイントを加算しました`]
      if (timeAdjustment.message) {
        messageParts.push(timeAdjustment.message)
      }

      return NextResponse.json({
        success: true,
        awardedPoints: totalAwardedPoints,
        checkpoint: { id: checkpoint.id, name: checkpoint.name },
        team: { id: team.id, name: team.name, total_score: updatedScore },
        message: messageParts.join(" / "),
      })
    }

    const rpcResult = await supabaseServer.rpc("team_checkpoint_checkin", {
      p_team_id: team.id,
      p_checkpoint_id: checkpoint.id,
    })

    if (!rpcResult.error && Array.isArray(rpcResult.data) && rpcResult.data[0]) {
      const result = rpcResult.data[0]
      if (result.already_checked_in) {
        return NextResponse.json(
          {
            success: false,
            alreadyCheckedIn: true,
            checkpoint: { id: checkpoint.id, name: checkpoint.name },
            team: { id: team.id, name: team.name, total_score: result.total_score },
            message: "このチェックポイントはすでにチェックイン済みです",
          },
          { status: 409 },
        )
      }

      return NextResponse.json({
        success: true,
        awardedPoints: result.awarded_points,
        checkpoint: { id: checkpoint.id, name: checkpoint.name },
        team: { id: team.id, name: team.name, total_score: result.total_score },
        message: `${result.awarded_points}ポイントを加算しました`,
      })
    }

    if (rpcResult.error && !shouldFallbackFromRpcError(rpcResult.error)) {
      console.error("RPC team_checkpoint_checkin failed:", rpcResult.error)
      return NextResponse.json({ error: "チェックイン処理に失敗しました" }, { status: 500 })
    }

    const existingCheckin = await supabaseServer
      .from("checkins")
      .select("id")
      .eq("team_id", team.id)
      .eq("checkpoint_id", checkpoint.id)
      .maybeSingle()

    if (existingCheckin.error && existingCheckin.error.code !== "PGRST116") {
      console.error("Error checking existing team checkin:", existingCheckin.error)
      return NextResponse.json({ error: "チェックイン確認に失敗しました" }, { status: 500 })
    }

    if (existingCheckin.data) {
      return NextResponse.json(
        {
          success: false,
          alreadyCheckedIn: true,
          checkpoint: { id: checkpoint.id, name: checkpoint.name },
          team: { id: team.id, name: team.name, total_score: team.total_score },
          message: "このチェックポイントはすでにチェックイン済みです",
        },
        { status: 409 },
      )
    }

    const insertCheckin = await supabaseServer.from("checkins").insert([{ team_id: team.id, checkpoint_id: checkpoint.id }])

    if (insertCheckin.error) {
      if (insertCheckin.error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            alreadyCheckedIn: true,
            checkpoint: { id: checkpoint.id, name: checkpoint.name },
            team: { id: team.id, name: team.name, total_score: team.total_score },
            message: "このチェックポイントはすでにチェックイン済みです",
          },
          { status: 409 },
        )
      }

      console.error("Error inserting checkin:", insertCheckin.error)
      return NextResponse.json({ error: "チェックイン登録に失敗しました" }, { status: 500 })
    }

    const awardedPoints = normalizePointValue(checkpoint.point_value)
    const updatedScore = (team.total_score || 0) + awardedPoints
    const updateScore = await supabaseServer.from("teams").update({ total_score: updatedScore }).eq("id", team.id)

    if (updateScore.error) {
      await supabaseServer.from("checkins").delete().eq("team_id", team.id).eq("checkpoint_id", checkpoint.id)
      console.error("Error updating team score:", updateScore.error)
      return NextResponse.json({ error: "ポイント加算に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      awardedPoints,
      checkpoint: { id: checkpoint.id, name: checkpoint.name },
      team: { id: team.id, name: team.name, total_score: updatedScore },
      message: `${awardedPoints}ポイントを加算しました`,
    })
  } catch (error) {
    console.error("Error in POST /api/checkpoints/checkin:", error)
    return NextResponse.json({ error: "チェックイン処理中にエラーが発生しました" }, { status: 500 })
  }
}
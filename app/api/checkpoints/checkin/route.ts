import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

const LOCK_TIMEOUT_MINUTES = 10

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

const isTeamLockTableMissing = (error: { code?: string; message?: string } | null | undefined) => {
  if (!error) return false
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (typeof error.message === "string" && error.message.includes("team_location_locks"))
  )
}

const shouldFallbackFromRpcError = (error: { code?: string; details?: string | null; message?: string } | null) => {
  if (!error) return false
  if (isMissingRpcFunction(error)) return true

  const details = typeof error.details === "string" ? error.details.toLowerCase() : ""
  const message = typeof error.message === "string" ? error.message.toLowerCase() : ""

  return error.code === "42702" && (details.includes("total_score") || message.includes('"total_score" is ambiguous'))
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

    let session: { team_id?: number; device_id?: string } | null = null
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json({ error: "セッション情報を解析できませんでした" }, { status: 401 })
    }

    const teamId = session?.team_id
    if (!teamId) {
      return NextResponse.json({ error: "有効なチームセッションではありません" }, { status: 401 })
    }

    if (!session?.device_id) {
      return NextResponse.json({ error: "端末認証情報が不足しています。再度チームログインしてください。" }, { status: 401 })
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

    const { data: existingLock, error: lockError } = await supabaseServer
      .from("team_location_locks")
      .select("team_id, device_id, last_seen")
      .eq("team_id", team.id)
      .maybeSingle()

    const lockTableMissing = isTeamLockTableMissing(lockError)
    if (lockError && !lockTableMissing) {
      console.error("Error fetching team device lock during checkin:", lockError)
      return NextResponse.json({ error: "端末認証の確認に失敗しました" }, { status: 500 })
    }

    if (!lockTableMissing && existingLock) {
      const isSameDevice = existingLock.device_id === session.device_id
      const lockExpiredAt = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000)
      const isExpired = new Date(existingLock.last_seen) < lockExpiredAt

      if (!isSameDevice && !isExpired) {
        return NextResponse.json(
          {
            error: "このチームは別の端末で利用中です。QRコードの読み取りは1端末のみ利用できます。",
            code: "DEVICE_LOCKED",
          },
          { status: 409 },
        )
      }

      const refreshedAt = new Date().toISOString()
      const { error: updateLockError } = await supabaseServer
        .from("team_location_locks")
        .update({
          device_id: session.device_id,
          last_seen: refreshedAt,
          updated_at: refreshedAt,
        })
        .eq("team_id", team.id)

      if (updateLockError) {
        console.error("Error refreshing team device lock during checkin:", updateLockError)
        return NextResponse.json({ error: "端末認証の更新に失敗しました" }, { status: 500 })
      }
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
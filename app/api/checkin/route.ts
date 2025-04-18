import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { teamId, checkpointId } = body

    console.log("Checkin request:", { teamId, checkpointId })

    if (!teamId || !checkpointId) {
      return NextResponse.json({ error: "Team ID and checkpoint ID are required", success: false }, { status: 400 })
    }

    // チェックインが既に存在するか確認
    const { data: existingCheckin, error: existingError } = await supabaseServer
      .from("checkins")
      .select("*")
      .eq("team_id", teamId)
      .eq("checkpoint_id", checkpointId)
      .single()

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing checkin:", existingError)
      return NextResponse.json({
        success: false,
        message: "チェックイン確認中にエラーが発生しました",
        debug: existingError,
      })
    }

    if (existingCheckin) {
      return NextResponse.json({ success: false, message: "このチェックポイントは既にチェックイン済みです" })
    }

    // チェックポイントの情報を取得
    const { data: checkpoint, error: checkpointError } = await supabaseServer
      .from("checkpoints")
      .select("point_value")
      .eq("id", checkpointId)
      .single()

    if (checkpointError || !checkpoint) {
      console.error("Error fetching checkpoint:", checkpointError)
      return NextResponse.json({
        success: false,
        message: "チェックポイントが見つかりません",
        debug: checkpointError,
      })
    }

    console.log("Checkpoint found:", checkpoint)

    // チェックインを記録
    const { error: checkinError } = await supabaseServer
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return NextResponse.json({
        success: false,
        message: "チェックインに失敗しました",
        debug: checkinError,
      })
    }

    // ポイント値を数値に変換
    const pointValue = Number.parseInt(checkpoint.point_value, 10) || 0
    console.log("Point value to add:", pointValue)

    // チームのスコアを更新
    const { data: team, error: teamError } = await supabaseServer
      .from("teams")
      .select("total_score")
      .eq("id", teamId)
      .single()

    if (teamError) {
      console.error("Error fetching team:", teamError)
      return NextResponse.json({
        success: false,
        message: "チーム情報の取得に失敗しました",
        debug: teamError,
      })
    }

    const newScore = (team.total_score || 0) + pointValue
    console.log("Updating team score from", team.total_score, "to", newScore)

    const { error: updateError } = await supabaseServer.from("teams").update({ total_score: newScore }).eq("id", teamId)

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return NextResponse.json({
        success: false,
        message: "スコア更新に失敗しました",
        debug: updateError,
      })
    }

    return NextResponse.json({
      success: true,
      message: `チェックインが完了しました！${pointValue}ポイント獲得しました！`,
    })
  } catch (error) {
    console.error("Error in POST /api/checkin:", error)
    return NextResponse.json({
      success: false,
      message: "チェックイン処理中にエラーが発生しました",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

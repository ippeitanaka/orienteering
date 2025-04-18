import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  console.log("Checkin API called")

  try {
    if (!supabaseServer) {
      console.error("Supabase server client is not available")
      return NextResponse.json(
        {
          success: false,
          message: "データベース接続が利用できません",
          debug: { error: "supabaseServer is null" },
        },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { teamId, checkpointId } = body

    console.log("Checkin request received:", { teamId, checkpointId })

    if (!teamId || !checkpointId) {
      console.error("Missing required parameters:", { teamId, checkpointId })
      return NextResponse.json(
        {
          success: false,
          message: "チームIDとチェックポイントIDが必要です",
          debug: { teamId, checkpointId },
        },
        { status: 400 },
      )
    }

    // チェックインが既に存在するか確認
    console.log("Checking if already checked in...")
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
      console.log("Already checked in:", existingCheckin)
      return NextResponse.json({
        success: false,
        message: "このチェックポイントは既にチェックイン済みです",
        debug: { existingCheckin },
      })
    }

    // チェックポイントの情報を取得
    console.log("Fetching checkpoint info...")
    const { data: checkpoint, error: checkpointError } = await supabaseServer
      .from("checkpoints")
      .select("*")
      .eq("id", checkpointId)
      .single()

    if (checkpointError || !checkpoint) {
      console.error("Error fetching checkpoint:", checkpointError)
      return NextResponse.json({
        success: false,
        message: "チェックポイントが見つかりません",
        debug: { error: checkpointError, checkpointId },
      })
    }

    console.log("Checkpoint found:", checkpoint)

    // チェックインを記録
    console.log("Creating checkin record...")
    const { data: checkinData, error: checkinError } = await supabaseServer
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])
      .select()

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return NextResponse.json({
        success: false,
        message: "チェックインに失敗しました",
        debug: { error: checkinError },
      })
    }

    console.log("Checkin created:", checkinData)

    // ポイント値を数値に変換
    let pointValue = 0
    try {
      // point_valueが文字列か数値かに関わらず適切に処理
      pointValue =
        typeof checkpoint.point_value === "string"
          ? Number.parseInt(checkpoint.point_value, 10)
          : checkpoint.point_value || 0

      if (isNaN(pointValue)) {
        console.error("Invalid point value:", checkpoint.point_value)
        pointValue = 0
      }
    } catch (e) {
      console.error("Error parsing point value:", e, "Original value:", checkpoint.point_value)
      pointValue = 0
    }

    console.log("Point value to add:", pointValue)

    // チームのスコアを更新
    console.log("Fetching team info...")
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
        debug: { error: teamError },
      })
    }

    console.log("Team found:", team)

    // 現在のスコアを確実に数値として扱う
    const currentScore =
      typeof team.total_score === "string" ? Number.parseInt(team.total_score, 10) : team.total_score || 0

    if (isNaN(currentScore)) {
      console.error("Invalid current score:", team.total_score)
    }

    const newScore = currentScore + pointValue

    console.log("Updating team score from", currentScore, "to", newScore)

    // スコアを更新
    const { data: updateData, error: updateError } = await supabaseServer
      .from("teams")
      .update({ total_score: newScore })
      .eq("id", teamId)
      .select()

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return NextResponse.json({
        success: false,
        message: "スコア更新に失敗しました",
        debug: { error: updateError },
      })
    }

    console.log("Team score updated:", updateData)

    return NextResponse.json({
      success: true,
      message: `チェックインが完了しました！${pointValue}ポイント獲得しました！`,
      data: {
        checkin: checkinData,
        team: updateData,
        pointsAdded: pointValue,
      },
    })
  } catch (error) {
    console.error("Unexpected error in POST /api/checkin:", error)
    return NextResponse.json({
      success: false,
      message: "チェックイン処理中に予期せぬエラーが発生しました",
      debug: { error: error instanceof Error ? error.message : String(error) },
    })
  }
}

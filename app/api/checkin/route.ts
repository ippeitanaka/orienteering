import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { teamId, checkpointId } = body

    if (!teamId || !checkpointId) {
      return NextResponse.json({ error: "Team ID and checkpoint ID are required" }, { status: 400 })
    }

    // チェックインが既に存在するか確認
    const { data: existingCheckin } = await supabaseServer
      .from("checkins")
      .select("*")
      .eq("team_id", teamId)
      .eq("checkpoint_id", checkpointId)
      .single()

    if (existingCheckin) {
      return NextResponse.json({ success: false, message: "このチェックポイントは既にチェックイン済みです" })
    }

    // チェックポイントの情報を取得
    const { data: checkpoint } = await supabaseServer
      .from("checkpoints")
      .select("point_value")
      .eq("id", checkpointId)
      .single()

    if (!checkpoint) {
      return NextResponse.json({ success: false, message: "チェックポイントが見つかりません" })
    }

    // チェックインを記録
    const { error: checkinError } = await supabaseServer
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return NextResponse.json({ success: false, message: "チェックインに失敗しました" })
    }

    // チームのスコアを更新
    const { error: updateError } = await supabaseServer.rpc("increment_team_score", {
      p_team_id: teamId,
      p_score: checkpoint.point_value,
    })

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return NextResponse.json({ success: false, message: "スコア更新に失敗しました" })
    }

    return NextResponse.json({ success: true, message: "チェックインが完了しました！" })
  } catch (error) {
    console.error("Error in POST /api/checkin:", error)
    return NextResponse.json({ success: false, message: "チェックイン処理中にエラーが発生しました" })
  }
}

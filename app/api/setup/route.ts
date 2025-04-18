import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST() {
  try {
    if (!supabaseServer) {
      return NextResponse.json(
        {
          success: false,
          message: "データベース接続が利用できません",
          debug: {
            message: "supabaseServer is null or undefined",
            env: {
              hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        },
        { status: 500 },
      )
    }

    // スタッフテーブルにデータがあるか確認
    const { data: existingStaff, error: checkError } = await supabaseServer.from("staff").select("*")

    if (checkError) {
      return NextResponse.json(
        { success: false, message: "データベース接続エラー: " + checkError.message },
        { status: 500 },
      )
    }

    // スタッフデータを挿入
    if (!existingStaff || existingStaff.length === 0) {
      const staffData = [
        { id: 10, name: "elt10", password: "elt10", checkpoint_id: null },
        { id: 11, name: "elt11", password: "elt11", checkpoint_id: null },
        { id: 12, name: "elt12", password: "elt12", checkpoint_id: null },
        { id: 13, name: "elt13", password: "elt13", checkpoint_id: null },
        { id: 14, name: "elt14", password: "elt14", checkpoint_id: null },
        { id: 15, name: "elt15", password: "elt15", checkpoint_id: null },
        { id: 16, name: "elt16", password: "elt16", checkpoint_id: null },
        { id: 17, name: "elt17", password: "elt17", checkpoint_id: null },
        { id: 18, name: "elt18", password: "elt18", checkpoint_id: null },
        { id: 19, name: "elt19", password: "elt19", checkpoint_id: null },
        { id: 20, name: "elt20", password: "elt20", checkpoint_id: null },
        { id: 999, name: "admin", password: "admin123", checkpoint_id: null },
      ]

      const { error: insertError } = await supabaseServer.from("staff").insert(staffData)

      if (insertError) {
        return NextResponse.json(
          { success: false, message: "スタッフデータの挿入エラー: " + insertError.message },
          { status: 500 },
        )
      }
    }

    // チームテーブルにデータがあるか確認
    const { data: existingTeams } = await supabaseServer.from("teams").select("*")

    if (!existingTeams || existingTeams.length === 0) {
      // サンプルチームデータを挿入
      const teamData = [
        { name: "レッドチーム", color: "#FF5555", total_score: 0, team_code: "red123" },
        { name: "ブルーチーム", color: "#5555FF", total_score: 0, team_code: "blue123" },
        { name: "グリーンチーム", color: "#55AA55", total_score: 0, team_code: "green123" },
        { name: "イエローチーム", color: "#FFAA00", total_score: 0, team_code: "yellow123" },
      ]

      const { error: teamInsertError } = await supabaseServer.from("teams").insert(teamData)

      if (teamInsertError) {
        return NextResponse.json(
          { success: false, message: "チームデータの挿入エラー: " + teamInsertError.message },
          { status: 500 },
        )
      }
    }

    // チェックポイントテーブルにデータがあるか確認
    const { data: existingCheckpoints } = await supabaseServer.from("checkpoints").select("*")

    if (!existingCheckpoints || existingCheckpoints.length === 0) {
      // サンプルチェックポイントデータを挿入
      const checkpointData = [
        {
          name: "スタート地点",
          description: "オリエンテーリングの開始地点",
          latitude: 35.7219,
          longitude: 139.7753,
          point_value: 10,
        },
        {
          name: "東洋大学正門",
          description: "東洋大学の正門前",
          latitude: 35.7225,
          longitude: 139.7748,
          point_value: 20,
        },
        {
          name: "図書館",
          description: "東洋大学図書館",
          latitude: 35.723,
          longitude: 139.776,
          point_value: 30,
        },
      ]

      const { error: checkpointInsertError } = await supabaseServer.from("checkpoints").insert(checkpointData)

      if (checkpointInsertError) {
        return NextResponse.json(
          { success: false, message: "チェックポイントデータの挿入エラー: " + checkpointInsertError.message },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "初期データのセットアップが完了しました",
      data: {
        staffCount: existingStaff?.length || 0,
        teamCount: existingTeams?.length || 0,
        checkpointCount: existingCheckpoints?.length || 0,
      },
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "セットアップ中にエラーが発生しました",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

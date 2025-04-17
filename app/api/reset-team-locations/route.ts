import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    // チーム位置情報テーブルから全データを削除
    const { error } = await supabaseServer.from("team_locations").delete().neq("id", 0) // 全レコードを削除するための条件

    if (error) {
      console.error("Error resetting team locations:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "全チームの位置情報がリセットされました",
    })
  } catch (error) {
    console.error("Error in POST /api/reset-team-locations:", error)
    return NextResponse.json(
      {
        error: "Failed to reset team locations",
        success: false,
      },
      { status: 500 },
    )
  }
}

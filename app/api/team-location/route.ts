import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { teamId, latitude, longitude } = body

    if (!teamId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Team ID, latitude and longitude are required" }, { status: 400 })
    }

    // 古い位置情報を削除
    const { error: deleteError } = await supabaseServer.from("team_locations").delete().eq("team_id", teamId)

    if (deleteError) {
      console.error("Error deleting old team location:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 新しい位置情報を追加
    const { error } = await supabaseServer.from("team_locations").insert([{ team_id: teamId, latitude, longitude }])

    if (error) {
      console.error("Error updating team location:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/team-location:", error)
    return NextResponse.json({ error: "Failed to update team location" }, { status: 500 })
  }
}

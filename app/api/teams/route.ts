import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// チーム一覧を取得
export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const { data, error } = await supabaseServer.from("teams").select("*").order("total_score", { ascending: false })

    if (error) {
      console.error("Error fetching teams:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

// チームを作成（team_codeを含める）
export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { name, color, team_code } = body

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
    }

    // チーム作成データを準備（team_codeを含める）
    const teamData: Record<string, any> = {
      name,
      color,
      total_score: 0,
    }

    // チームコードが指定されていれば追加
    if (team_code) {
      teamData.team_code = team_code
    }

    const { data, error } = await supabaseServer.from("teams").insert([teamData]).select()

    if (error) {
      console.error("Error creating team:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ data: data[0], success: true, message: "チームを作成しました" })
  } catch (error) {
    console.error("Error in POST /api/teams:", error)
    return NextResponse.json({ error: "Failed to create team", success: false }, { status: 500 })
  }
}

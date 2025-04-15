import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

// チーム一覧を取得
export async function GET() {
  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client.from("teams").select("*").order("total_score", { ascending: false })

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

// チームを作成
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from("teams")
      .insert([{ name, color, total_score: 0 }])
      .select()

    if (error) {
      console.error("Error creating team:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data[0], success: true, message: "チームを作成しました" })
  } catch (error) {
    console.error("Error in POST /api/teams:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}

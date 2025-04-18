import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// チェックポイント一覧を取得
export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const { data, error } = await supabaseServer.from("checkpoints").select("*").order("id")

    if (error) {
      console.error("Error fetching checkpoints:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/checkpoints:", error)
    return NextResponse.json({ error: "Failed to fetch checkpoints" }, { status: 500 })
  }
}

// 新しいチェックポイントを作成
export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { name, description, latitude, longitude, point_value } = body

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Name, latitude, and longitude are required" }, { status: 400 })
    }

    // point_valueを文字列として保存
    const checkpointData = {
      name,
      description,
      latitude,
      longitude,
      point_value: point_value ? String(point_value) : "0",
    }

    console.log("Creating checkpoint with data:", checkpointData)

    const { data, error } = await supabaseServer.from("checkpoints").insert([checkpointData]).select()

    if (error) {
      console.error("Error creating checkpoint:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ data: data[0], success: true, message: "チェックポイントを作成しました" })
  } catch (error) {
    console.error("Error in POST /api/checkpoints:", error)
    return NextResponse.json({ error: "Failed to create checkpoint", success: false }, { status: 500 })
  }
}

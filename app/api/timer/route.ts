import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// タイマー設定を取得するAPI
export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from("timer_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching timer settings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data?.[0] || null })
  } catch (error) {
    console.error("Error in GET /api/timer:", error)
    return NextResponse.json({ error: "Failed to fetch timer settings" }, { status: 500 })
  }
}

// タイマーを開始するAPI
export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { duration } = body

    if (typeof duration !== "number" || duration <= 0) {
      return NextResponse.json({ error: "Valid duration is required" }, { status: 400 })
    }

    const endTime = new Date(Date.now() + duration * 1000).toISOString()

    // 既存のタイマー設定を取得
    const { data: existingTimer } = await supabaseServer
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    let result

    if (existingTimer && existingTimer.length > 0) {
      // 既存の設定を更新
      result = await supabaseServer
        .from("timer_settings")
        .update({
          duration,
          end_time: endTime,
          is_running: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTimer[0].id)
    } else {
      // 新しい設定を作成
      result = await supabaseServer.from("timer_settings").insert([
        {
          duration,
          end_time: endTime,
          is_running: true,
        },
      ])
    }

    if (result.error) {
      console.error("Error starting timer:", result.error)
      return NextResponse.json({ error: result.error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Timer started successfully" })
  } catch (error) {
    console.error("Error in POST /api/timer:", error)
    return NextResponse.json({ error: "Failed to start timer", success: false }, { status: 500 })
  }
}

// タイマーを停止するAPI
export async function DELETE() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    // 既存のタイマー設定を取得
    const { data: existingTimer } = await supabaseServer
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (!existingTimer || existingTimer.length === 0) {
      return NextResponse.json({ error: "No timer settings found", success: false }, { status: 404 })
    }

    // タイマーを停止
    const { error } = await supabaseServer
      .from("timer_settings")
      .update({
        is_running: false,
        end_time: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTimer[0].id)

    if (error) {
      console.error("Error stopping timer:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Timer stopped successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/timer:", error)
    return NextResponse.json({ error: "Failed to stop timer", success: false }, { status: 500 })
  }
}

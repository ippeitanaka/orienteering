import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// タイマー設定を取得するAPI
export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    console.log("Fetching timer settings from database")

    // タイマー設定テーブルが存在するか確認
    const { error: tableCheckError } = await supabaseServer.from("timer_settings").select("count").limit(1)

    if (tableCheckError) {
      console.error("Error checking timer_settings table:", tableCheckError)

      // テーブルが存在しない場合は作成
      if (tableCheckError.code === "42P01") {
        // テーブルが存在しないエラーコード
        console.log("Creating timer_settings table")

        // テーブル作成のSQLを実行
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS timer_settings (
            id SERIAL PRIMARY KEY,
            duration INTEGER NOT NULL DEFAULT 0,
            end_time TIMESTAMP WITH TIME ZONE,
            is_running BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO timer_settings (duration, is_running)
          VALUES (3600, FALSE)
          ON CONFLICT DO NOTHING;
        `

        const { error: createError } = await supabaseServer.rpc("exec_sql", { sql: createTableSQL })

        if (createError) {
          console.error("Error creating timer_settings table:", createError)
          return NextResponse.json({ error: "Failed to create timer settings table" }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: tableCheckError.message }, { status: 500 })
      }
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

    // データが存在しない場合は初期データを作成
    if (!data || data.length === 0) {
      console.log("No timer settings found, creating default")

      const { data: newData, error: insertError } = await supabaseServer
        .from("timer_settings")
        .insert([{ duration: 3600, is_running: false }])
        .select()

      if (insertError) {
        console.error("Error creating default timer settings:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ data: newData?.[0] || null })
    }

    return NextResponse.json({ data: data[0] || null })
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
    console.log(`Starting timer with duration ${duration}s, end time: ${endTime}`)

    // 既存のタイマー設定を取得
    const { data: existingTimer, error: fetchError } = await supabaseServer
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (fetchError && fetchError.code === "42P01") {
      // テーブルが存在しない場合は作成
      console.log("Creating timer_settings table")

      // テーブル作成のSQLを実行
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS timer_settings (
          id SERIAL PRIMARY KEY,
          duration INTEGER NOT NULL DEFAULT 0,
          end_time TIMESTAMP WITH TIME ZONE,
          is_running BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      const { error: createError } = await supabaseServer.rpc("exec_sql", { sql: createTableSQL })

      if (createError) {
        console.error("Error creating timer_settings table:", createError)
        return NextResponse.json({ error: "Failed to create timer settings table" }, { status: 500 })
      }
    }

    let result

    if (existingTimer && existingTimer.length > 0) {
      // 既存の設定を更新
      console.log(`Updating existing timer with ID: ${existingTimer[0].id}`)
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
      console.log("Creating new timer settings")
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
    const { data: existingTimer, error: fetchError } = await supabaseServer
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Error fetching timer settings:", fetchError)

      if (fetchError.code === "42P01") {
        // テーブルが存在しない場合は作成して初期データを挿入
        console.log("Creating timer_settings table")

        // テーブル作成のSQLを実行
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS timer_settings (
            id SERIAL PRIMARY KEY,
            duration INTEGER NOT NULL DEFAULT 0,
            end_time TIMESTAMP WITH TIME ZONE,
            is_running BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO timer_settings (duration, is_running)
          VALUES (3600, FALSE)
          ON CONFLICT DO NOTHING;
        `

        const { error: createError } = await supabaseServer.rpc("exec_sql", { sql: createTableSQL })

        if (createError) {
          console.error("Error creating timer_settings table:", createError)
          return NextResponse.json({ error: "Failed to create timer settings table" }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Timer initialized and stopped" })
      }

      return NextResponse.json({ error: fetchError.message, success: false }, { status: 500 })
    }

    if (!existingTimer || existingTimer.length === 0) {
      // タイマー設定がない場合は新規作成
      const { error: insertError } = await supabaseServer
        .from("timer_settings")
        .insert([{ duration: 3600, is_running: false, end_time: null }])

      if (insertError) {
        console.error("Error creating default timer settings:", insertError)
        return NextResponse.json({ error: insertError.message, success: false }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Timer initialized and stopped" })
    }

    // タイマーを停止
    console.log(`Stopping timer with ID: ${existingTimer[0].id}`)
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

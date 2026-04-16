import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

const DEFAULT_SETTINGS = {
  team_location_auto_update_enabled: true,
  team_location_update_interval_seconds: 180,
  team_map_auto_refresh_enabled: true,
  team_map_refresh_interval_seconds: 180,
}

async function isStaffAuthenticated() {
  const cookieStore = await cookies()
  const staffSession = cookieStore.get("staff_session")
  const staffId = cookieStore.get("staff_id")
  const staffName = cookieStore.get("staff_name")

  if (staffSession?.value) {
    try {
      const session = JSON.parse(staffSession.value)
      if (session?.staff_id) {
        return true
      }
    } catch (error) {
      console.error("Failed to parse staff session during settings update:", error)
    }
  }

  return Boolean(staffId?.value && staffName?.value)
}

async function ensureTeamMapSettingsTable() {
  if (!supabaseServer) {
    return { error: new Error("Database connection not available") }
  }

  const { error: tableCheckError } = await supabaseServer.from("team_map_settings").select("id").limit(1)

  if (tableCheckError && tableCheckError.code !== "42P01") {
    return { error: tableCheckError }
  }

  if (tableCheckError?.code === "42P01") {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS team_map_settings (
        id INTEGER PRIMARY KEY,
        team_location_auto_update_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        team_location_update_interval_seconds INTEGER NOT NULL DEFAULT 180,
        team_map_auto_refresh_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        team_map_refresh_interval_seconds INTEGER NOT NULL DEFAULT 180,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      INSERT INTO team_map_settings (
        id,
        team_location_auto_update_enabled,
        team_location_update_interval_seconds,
        team_map_auto_refresh_enabled,
        team_map_refresh_interval_seconds
      ) VALUES (1, TRUE, 180, TRUE, 180)
      ON CONFLICT (id) DO NOTHING;
    `

    const { error: createError } = await supabaseServer.rpc("exec_sql", { sql: createTableSQL })

    if (createError) {
      return { error: createError }
    }
  }

  const { data, error } = await supabaseServer.from("team_map_settings").select("*").eq("id", 1).maybeSingle()

  if (error) {
    return { error }
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabaseServer
      .from("team_map_settings")
      .insert([{ id: 1, ...DEFAULT_SETTINGS }])
      .select()
      .maybeSingle()

    if (insertError) {
      return { error: insertError }
    }

    return { data: inserted }
  }

  return { data }
}

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const result = await ensureTeamMapSettingsTable()

    if (result.error) {
      console.error("Failed to fetch team map settings:", result.error)
      return NextResponse.json({ error: result.error.message || "Failed to fetch team map settings" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        ...DEFAULT_SETTINGS,
        ...result.data,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/team-map-settings:", error)
    return NextResponse.json({ error: "Failed to fetch team map settings" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isStaffAuthenticated())) {
      return NextResponse.json({ error: "スタッフ認証が必要です", success: false }, { status: 401 })
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available", success: false }, { status: 500 })
    }

    const ensured = await ensureTeamMapSettingsTable()
    if (ensured.error) {
      console.error("Failed to ensure team map settings table:", ensured.error)
      return NextResponse.json({ error: ensured.error.message || "Failed to save settings", success: false }, { status: 500 })
    }

    const body = await request.json()
    const nextSettings = {
      team_location_auto_update_enabled: body?.team_location_auto_update_enabled !== false,
      team_location_update_interval_seconds: Number(body?.team_location_update_interval_seconds ?? DEFAULT_SETTINGS.team_location_update_interval_seconds),
      team_map_auto_refresh_enabled: body?.team_map_auto_refresh_enabled !== false,
      team_map_refresh_interval_seconds: Number(body?.team_map_refresh_interval_seconds ?? DEFAULT_SETTINGS.team_map_refresh_interval_seconds),
      updated_at: new Date().toISOString(),
    }

    const intervalValues = [
      nextSettings.team_location_update_interval_seconds,
      nextSettings.team_map_refresh_interval_seconds,
    ]

    if (intervalValues.some((value) => !Number.isFinite(value) || value < 30 || value > 600)) {
      return NextResponse.json(
        { error: "更新間隔は30秒から600秒の範囲で設定してください", success: false },
        { status: 400 },
      )
    }

    const { data, error } = await supabaseServer
      .from("team_map_settings")
      .upsert([{ id: 1, ...nextSettings }], { onConflict: "id" })
      .select()
      .maybeSingle()

    if (error) {
      console.error("Failed to update team map settings:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/team-map-settings:", error)
    return NextResponse.json({ error: "Failed to update team map settings", success: false }, { status: 500 })
  }
}
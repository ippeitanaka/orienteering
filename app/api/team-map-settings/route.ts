import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

const DEFAULT_SETTINGS = {
  team_location_auto_update_enabled: true,
  team_location_update_interval_seconds: 180,
  team_map_auto_refresh_enabled: true,
  team_map_refresh_interval_seconds: 180,
}

const isTeamMapSettingsTableMissing = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        (typeof error.message === "string" && error.message.includes("team_map_settings"))),
  )

  const TEAM_MAP_SETTINGS_SETUP_MESSAGE =
    "team_map_settings テーブルが未作成です。Supabase SQL Editor で scripts/add-team-map-settings-table.sql もしくは scripts/create-tables.sql を実行してください。"

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

  const tableMissing = isTeamMapSettingsTableMissing(tableCheckError)

  if (tableCheckError && !tableMissing) {
    return { error: tableCheckError }
  }

  if (tableMissing) {
    return { tableMissing: true }
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
      return NextResponse.json({ data: DEFAULT_SETTINGS, fallback: true })
    }

    if (result.tableMissing) {
      return NextResponse.json({ data: DEFAULT_SETTINGS, fallback: true, warning: TEAM_MAP_SETTINGS_SETUP_MESSAGE })
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

    if (ensured.tableMissing) {
      return NextResponse.json({ error: TEAM_MAP_SETTINGS_SETUP_MESSAGE, success: false }, { status: 503 })
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
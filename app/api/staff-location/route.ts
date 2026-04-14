import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const ensureStaffLocationsTable = async () => {
  if (!supabaseServer) {
    return { success: false, error: "Database connection not available" }
  }

  const { error } = await supabaseServer.from("staff_locations").select("staff_id").limit(1)

  const tableMissing =
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" && error.message.includes("staff_locations"))

  if (error && !tableMissing) {
    return { success: false, error: error.message }
  }

  if (!tableMissing) {
    return { success: true }
  }

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS staff_locations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      staff_id INTEGER UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
  `

  const { error: createError } = await supabaseServer.rpc("exec_sql", { sql: createTableSQL })

  if (createError) {
    return { success: false, error: createError.message }
  }

  return { success: true }
}

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
    const { staffId, latitude, longitude } = body

    if (!staffId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Staff ID, latitude and longitude are required" }, { status: 400 })
    }

    const ensureResult = await ensureStaffLocationsTable()
    if (!ensureResult.success) {
      return NextResponse.json({ error: ensureResult.error }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { error } = await supabaseServer.from("staff_locations").upsert(
      [
        {
          staff_id: staffId,
          latitude,
          longitude,
          timestamp: now,
          updated_at: now,
        },
      ],
      { onConflict: "staff_id" },
    )

    if (error) {
      console.error("Error updating staff location:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in POST /api/staff-location:", error)
    return NextResponse.json({ error: "Failed to update staff location" }, { status: 500 })
  }
}
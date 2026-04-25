import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const isMissingStaffLocationsTable = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        (typeof error.message === "string" && error.message.includes("staff_locations"))),
  )

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

    const { data: staff, error: staffError } = await supabaseServer
      .from("staff")
      .select("id, checkpoint_id")
      .eq("id", staffId)
      .maybeSingle()

    if (staffError) {
      console.error("Error fetching staff assignment:", staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 })
    }

    if (!staff.checkpoint_id) {
      return NextResponse.json({ error: "このスタッフには移動チェックポイントが割り当てられていません" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: checkpointUpdateError } = await supabaseServer
      .from("checkpoints")
      .update({ latitude, longitude })
      .eq("id", staff.checkpoint_id)

    if (checkpointUpdateError) {
      console.error("Error updating moving checkpoint position:", checkpointUpdateError)
      return NextResponse.json({ error: checkpointUpdateError.message }, { status: 500 })
    }

    const { error: historyUpsertError } = await supabaseServer.from("staff_locations").upsert(
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

    if (historyUpsertError && !isMissingStaffLocationsTable(historyUpsertError)) {
      console.error("Error updating staff location history:", historyUpsertError)
      return NextResponse.json({ error: historyUpsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkpointId: staff.checkpoint_id, savedHistory: !historyUpsertError })
  } catch (error) {
    console.error("Error in POST /api/staff-location:", error)
    return NextResponse.json({ error: "Failed to update staff location" }, { status: 500 })
  }
}
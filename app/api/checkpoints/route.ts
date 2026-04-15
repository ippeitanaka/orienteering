import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const normalizePointValue = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

// チェックポイント一覧を取得
export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const [{ data, error }, { data: staffData, error: staffError }, { data: staffLocations, error: staffLocationError }] =
      await Promise.all([
        supabaseServer.from("checkpoints").select("*").order("id"),
        supabaseServer.from("staff").select("id, name, checkpoint_id"),
        supabaseServer.from("staff_locations").select("*").order("timestamp", { ascending: false }),
      ])

    if (error) {
      console.error("Error fetching checkpoints:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const staffTableMissing =
      staffError?.code === "42P01" ||
      staffError?.code === "PGRST205" ||
      (typeof staffError?.message === "string" && staffError.message.includes("staff"))

    if (staffError && !staffTableMissing) {
      console.error("Error fetching staff assignments:", staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    const staffLocationTableMissing =
      staffLocationError?.code === "42P01" ||
      staffLocationError?.code === "PGRST205" ||
      (typeof staffLocationError?.message === "string" && staffLocationError.message.includes("staff_locations"))

    if (staffLocationError && !staffLocationTableMissing) {
      console.error("Error fetching staff locations:", staffLocationError)
      return NextResponse.json({ error: staffLocationError.message }, { status: 500 })
    }

    const assignedStaffByCheckpoint = new Map<number, { id: number; name: string }>()
    for (const staff of staffData || []) {
      if (staff.checkpoint_id) {
        assignedStaffByCheckpoint.set(staff.checkpoint_id, { id: staff.id, name: staff.name })
      }
    }

    const latestStaffLocations = new Map<number, any>()
    for (const location of staffLocations || []) {
      if (!latestStaffLocations.has(location.staff_id)) {
        latestStaffLocations.set(location.staff_id, location)
      }
    }

    const enrichedCheckpoints = (data || []).map((checkpoint) => {
      const assignedStaff = assignedStaffByCheckpoint.get(checkpoint.id)
      const latestLocation = assignedStaff ? latestStaffLocations.get(assignedStaff.id) : null

      return {
        ...checkpoint,
        point_value: normalizePointValue(checkpoint.point_value),
        is_moving: !!assignedStaff,
        assigned_staff_id: assignedStaff?.id ?? null,
        assigned_staff_name: assignedStaff?.name ?? null,
        base_latitude: checkpoint.latitude,
        base_longitude: checkpoint.longitude,
        latitude: latestLocation?.latitude ?? checkpoint.latitude,
        longitude: latestLocation?.longitude ?? checkpoint.longitude,
        location_source: assignedStaff ? (latestLocation ? "staff" : "static-fallback") : "static",
        last_location_update: latestLocation?.timestamp ?? null,
      }
    })

    return NextResponse.json({ data: enrichedCheckpoints })
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
    const { name, description, latitude, longitude, point_value, assigned_staff_id } = body

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

    const createdCheckpoint = data?.[0]

    if (createdCheckpoint && assigned_staff_id) {
      await supabaseServer.from("staff").update({ checkpoint_id: null }).eq("checkpoint_id", createdCheckpoint.id)
      await supabaseServer.from("staff").update({ checkpoint_id: null }).eq("id", assigned_staff_id)

      const { error: assignError } = await supabaseServer
        .from("staff")
        .update({ checkpoint_id: createdCheckpoint.id })
        .eq("id", assigned_staff_id)

      if (assignError) {
        console.error("Error assigning moving checkpoint staff:", assignError)
        return NextResponse.json({ error: assignError.message, success: false }, { status: 500 })
      }
    }

    return NextResponse.json({ data: createdCheckpoint, success: true, message: "チェックポイントを作成しました" })
  } catch (error) {
    console.error("Error in POST /api/checkpoints:", error)
    return NextResponse.json({ error: "Failed to create checkpoint", success: false }, { status: 500 })
  }
}

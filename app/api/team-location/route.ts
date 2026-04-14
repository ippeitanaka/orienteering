import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const LOCK_TIMEOUT_MINUTES = 10

const isAccuracyColumnMissing = (error: { code?: string; message?: string } | null) => {
  if (!error) {
    return false
  }

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (typeof error.message === "string" && error.message.toLowerCase().includes("accuracy"))
  )
}

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const body = await request.json()
  const { teamId, latitude, longitude, deviceId, accuracy } = body

    if (!teamId || latitude === undefined || longitude === undefined || !deviceId) {
      return NextResponse.json({ error: "Team ID, latitude, longitude and deviceId are required" }, { status: 400 })
    }

    const { data: existingLock, error: fetchLockError } = await supabaseServer
      .from("team_location_locks")
      .select("team_id, device_id, last_seen")
      .eq("team_id", teamId)
      .maybeSingle()

    const lockTableMissing =
      fetchLockError?.code === "42P01" ||
      fetchLockError?.code === "PGRST205" ||
      (typeof fetchLockError?.message === "string" && fetchLockError.message.includes("team_location_locks"))

    if (fetchLockError && !lockTableMissing) {
      console.error("Error fetching location lock:", fetchLockError)
      return NextResponse.json({ error: fetchLockError.message }, { status: 500 })
    }

    const now = new Date()
    const lockExpiredAt = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000)

    // team_location_locksテーブルが存在する場合のみ1チーム1端末制限を強制
    if (!lockTableMissing) {
      if (!existingLock) {
        const { error: insertLockError } = await supabaseServer.from("team_location_locks").insert([
          {
            team_id: teamId,
            device_id: deviceId,
            last_seen: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ])

        if (insertLockError) {
          console.error("Error creating location lock:", insertLockError)
          return NextResponse.json({ error: insertLockError.message }, { status: 500 })
        }
      } else {
        const isSameDevice = existingLock.device_id === deviceId
        const lastSeen = new Date(existingLock.last_seen)
        const isExpired = lastSeen < lockExpiredAt

        if (!isSameDevice && !isExpired) {
          return NextResponse.json(
            {
              error: "このチームは別の端末で位置共有中です。1チーム1端末のみ利用できます。",
              code: "DEVICE_LOCKED",
            },
            { status: 409 },
          )
        }

        const { error: updateLockError } = await supabaseServer
          .from("team_location_locks")
          .update({
            device_id: deviceId,
            last_seen: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("team_id", teamId)

        if (updateLockError) {
          console.error("Error updating location lock:", updateLockError)
          return NextResponse.json({ error: updateLockError.message }, { status: 500 })
        }
      }
    }

    // 古い位置情報を削除
    const { error: deleteError } = await supabaseServer.from("team_locations").delete().eq("team_id", teamId)

    if (deleteError) {
      console.error("Error deleting old team location:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 新しい位置情報を追加
    const locationRecord = {
      team_id: teamId,
      latitude,
      longitude,
      timestamp: now.toISOString(),
      ...(typeof accuracy === "number" ? { accuracy } : {}),
    }

    let { error } = await supabaseServer.from("team_locations").insert([locationRecord])

    if (error && isAccuracyColumnMissing(error)) {
      const fallbackInsert = await supabaseServer.from("team_locations").insert([
        {
          team_id: teamId,
          latitude,
          longitude,
          timestamp: now.toISOString(),
        },
      ])
      error = fallbackInsert.error
    }

    if (error) {
      console.error("Error updating team location:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lockEnforced: !lockTableMissing })
  } catch (error) {
    console.error("Error in POST /api/team-location:", error)
    return NextResponse.json({ error: "Failed to update team location" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from("team_locations")
      .select("*")
      .order("timestamp", { ascending: false })

    if (error) {
      console.error("Error fetching team locations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 各チームの最新の位置情報のみを取得
    const latestLocations: Record<number, any> = {}
    data.forEach((location: any) => {
      if (
        !latestLocations[location.team_id] ||
        new Date(location.timestamp) > new Date(latestLocations[location.team_id].timestamp)
      ) {
        latestLocations[location.team_id] = location
      }
    })

    return NextResponse.json({ data: Object.values(latestLocations) })
  } catch (error) {
    console.error("Error in GET /api/team-locations:", error)
    return NextResponse.json({ error: "Failed to fetch team locations" }, { status: 500 })
  }
}

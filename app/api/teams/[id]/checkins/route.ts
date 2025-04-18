import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const teamId = params.id
    console.log("Fetching checkins for team ID:", teamId)

    const { data, error } = await supabaseServer.from("checkins").select("*, checkpoints(*)").eq("team_id", teamId)

    if (error) {
      console.error("Error fetching team checkins:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Found checkins:", data?.length || 0)
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in GET /api/teams/[id]/checkins:", error)
    return NextResponse.json({ error: "Failed to fetch team checkins" }, { status: 500 })
  }
}

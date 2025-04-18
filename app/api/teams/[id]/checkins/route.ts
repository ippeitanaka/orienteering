import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      console.error("Supabase server client is not available")
      return NextResponse.json(
        {
          error: "Database connection not available",
          debug: { message: "supabaseServer is null" },
        },
        { status: 500 },
      )
    }

    const teamId = params.id
    console.log("Fetching checkins for team ID:", teamId)

    const { data, error } = await supabaseServer.from("checkins").select("*, checkpoints(*)").eq("team_id", teamId)

    if (error) {
      console.error("Error fetching team checkins:", error)
      return NextResponse.json(
        {
          error: error.message,
          debug: { error },
        },
        { status: 500 },
      )
    }

    console.log(`Found ${data?.length || 0} checkins for team ${teamId}`)
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in GET /api/teams/[id]/checkins:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch team checkins",
        debug: { error: error instanceof Error ? error.message : String(error) },
      },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const checkpointId = params.id

    const { data, error } = await supabaseServer.from("checkpoints").select("*").eq("id", checkpointId).single()

    if (error) {
      console.error("Error fetching checkpoint:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/checkpoints/[id]:", error)
    return NextResponse.json({ error: "Failed to fetch checkpoint" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const teamId = params.id
    const body = await request.json()
    const { points } = body

    if (points === undefined) {
      return NextResponse.json({ error: "Points are required", success: false }, { status: 400 })
    }

    // チームが存在するか確認
    const { data: team, error: teamError } = await supabaseServer
      .from("teams")
      .select("total_score")
      .eq("id", teamId)
      .single()

    if (teamError) {
      console.error("Error fetching team:", teamError)
      return NextResponse.json({ error: "Team not found", success: false }, { status: 404 })
    }

    // 現在のスコアを確実に数値として扱う
    const currentScore =
      typeof team.total_score === "string" ? Number.parseInt(team.total_score, 10) : team.total_score || 0

    if (isNaN(currentScore)) {
      console.error("Invalid current score:", team.total_score)
      return NextResponse.json({ error: "Invalid current score", success: false }, { status: 500 })
    }

    const newScore = currentScore + points

    // スコアを更新
    const { error: updateError } = await supabaseServer.from("teams").update({ total_score: newScore }).eq("id", teamId)

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return NextResponse.json({ error: "Failed to update score", success: false }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${points >= 0 ? points + "ポイントを追加" : Math.abs(points) + "ポイントを減算"}しました`,
    })
  } catch (error) {
    console.error("Error in POST /api/teams/[id]/add-points:", error)
    return NextResponse.json({ error: "Failed to add points", success: false }, { status: 500 })
  }
}

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
    console.log("Fetching team with ID:", teamId)

    const { data, error } = await supabaseServer.from("teams").select("*").eq("id", teamId).single()

    if (error) {
      console.error("Error fetching team:", error)
      return NextResponse.json(
        {
          error: error.message,
          debug: { error },
        },
        { status: 500 },
      )
    }

    if (!data) {
      console.error("Team not found:", teamId)
      return NextResponse.json(
        {
          error: "Team not found",
          debug: { teamId },
        },
        { status: 404 },
      )
    }

    console.log("Team found:", data)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/teams/[id]:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch team",
        debug: { error: error instanceof Error ? error.message : String(error) },
      },
      { status: 500 },
    )
  }
}

// チーム更新用のPUTメソッドを修正
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const teamId = params.id
    const body = await request.json()

    // 更新可能なフィールドを制限（team_codeを含める）
    const { name, color, team_code } = body
    const updateData: Record<string, any> = {}

    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (team_code !== undefined) updateData.team_code = team_code

    // データが空の場合はエラー
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    console.log(`Updating team ${teamId} with data:`, updateData)

    const { data, error } = await supabaseServer.from("teams").update(updateData).eq("id", teamId).select()

    if (error) {
      console.error("Error updating team:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Team not found", success: false }, { status: 404 })
    }

    return NextResponse.json({ data: data[0], success: true, message: "チームを更新しました" })
  } catch (error) {
    console.error("Error in PUT /api/teams/[id]:", error)
    return NextResponse.json({ error: "Failed to update team", success: false }, { status: 500 })
  }
}

// チーム削除用のDELETEメソッドを追加
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const teamId = params.id

    // チームが存在するか確認
    const { data: team, error: checkError } = await supabaseServer.from("teams").select("id").eq("id", teamId).single()

    if (checkError || !team) {
      return NextResponse.json({ error: "Team not found", success: false }, { status: 404 })
    }

    // チームを削除
    const { error } = await supabaseServer.from("teams").delete().eq("id", teamId)

    if (error) {
      console.error("Error deleting team:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "チームを削除しました" })
  } catch (error) {
    console.error("Error in DELETE /api/teams/[id]:", error)
    return NextResponse.json({ error: "Failed to delete team", success: false }, { status: 500 })
  }
}

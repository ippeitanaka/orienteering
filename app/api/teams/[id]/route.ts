import { NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

// チームを更新
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const { name, color } = body

    if (!name && !color) {
      return NextResponse.json({ error: "At least one field (name or color) is required" }, { status: 400 })
    }

    const client = supabaseAdmin || supabase

    // 更新するフィールドを準備
    const updateData: { name?: string; color?: string } = {}
    if (name) updateData.name = name
    if (color) updateData.color = color

    // 更新操作を実行
    const { error: updateError } = await client.from("teams").update(updateData).eq("id", id)

    if (updateError) {
      console.error("Error updating team:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 更新後のデータを取得
    const { data: updatedData, error: fetchError } = await client.from("teams").select("*").eq("id", id).single()

    if (fetchError) {
      console.error("Error fetching updated team:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedData,
      success: true,
      message: "チームを更新しました",
    })
  } catch (error) {
    console.error("Error in PUT /api/teams/[id]:", error)
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 })
  }
}

// チームを削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const client = supabaseAdmin || supabase

    const { error } = await client.from("teams").delete().eq("id", id)

    if (error) {
      console.error("Error deleting team:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "チームを削除しました",
    })
  } catch (error) {
    console.error("Error in DELETE /api/teams/[id]:", error)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}

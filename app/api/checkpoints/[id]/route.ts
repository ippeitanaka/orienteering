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

// チェックポイント更新用のPUTメソッド
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const checkpointId = params.id
    const body = await request.json()

    // 更新可能なフィールドを制限
    const { name, description, latitude, longitude, point_value } = body
    const updateData: Record<string, any> = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (point_value !== undefined) updateData.point_value = String(point_value) // 文字列に変換

    // データが空の場合はエラー
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    console.log("Updating checkpoint with data:", updateData)

    const { data, error } = await supabaseServer.from("checkpoints").update(updateData).eq("id", checkpointId).select()

    if (error) {
      console.error("Error updating checkpoint:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Checkpoint not found", success: false }, { status: 404 })
    }

    return NextResponse.json({ data: data[0], success: true, message: "チェックポイントを更新しました" })
  } catch (error) {
    console.error("Error in PUT /api/checkpoints/[id]:", error)
    return NextResponse.json({ error: "Failed to update checkpoint", success: false }, { status: 500 })
  }
}

// チェックポイント削除用のDELETEメソッド
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 })
    }

    const checkpointId = params.id

    // チェックポイントが存在するか確認
    const { data: checkpoint, error: checkError } = await supabaseServer
      .from("checkpoints")
      .select("id")
      .eq("id", checkpointId)
      .single()

    if (checkError || !checkpoint) {
      return NextResponse.json({ error: "Checkpoint not found", success: false }, { status: 404 })
    }

    // チェックポイントを削除
    const { error } = await supabaseServer.from("checkpoints").delete().eq("id", checkpointId)

    if (error) {
      console.error("Error deleting checkpoint:", error)
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "チェックポイントを削除しました" })
  } catch (error) {
    console.error("Error in DELETE /api/checkpoints/[id]:", error)
    return NextResponse.json({ error: "Failed to delete checkpoint", success: false }, { status: 500 })
  }
}

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// チェックポイントを更新
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const requestData = await request.json()
    const { name, latitude, longitude, points } = requestData

    if (!name || latitude === undefined || longitude === undefined || points === undefined) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from("checkpoints")
      .update({ name, latitude, longitude, points })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("チェックポイント更新エラー:", error)
      return NextResponse.json({ error: "チェックポイントの更新に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkpoint: data })
  } catch (error) {
    console.error("チェックポイント更新エラー:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}

// チェックポイントを削除
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { error } = await supabase.from("checkpoints").delete().eq("id", id)

    if (error) {
      console.error("チェックポイント削除エラー:", error)
      return NextResponse.json({ error: "チェックポイントの削除に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("チェックポイント削除エラー:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}

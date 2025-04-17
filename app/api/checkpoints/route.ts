import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// チェックポイント一覧を取得
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: checkpoints, error } = await supabase.from("checkpoints").select("*").order("id")

    if (error) {
      console.error("チェックポイント取得エラー:", error)
      return NextResponse.json({ error: "チェックポイントの取得に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ checkpoints })
  } catch (error) {
    console.error("チェックポイント取得エラー:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}

// 新しいチェックポイントを作成
export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { name, latitude, longitude, points } = requestData

    if (!name || latitude === undefined || longitude === undefined || points === undefined) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase
      .from("checkpoints")
      .insert([{ name, latitude, longitude, points }])
      .select()
      .single()

    if (error) {
      console.error("チェックポイント作成エラー:", error)
      return NextResponse.json({ error: "チェックポイントの作成に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ success: true, checkpoint: data })
  } catch (error) {
    console.error("チェックポイント作成エラー:", error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}

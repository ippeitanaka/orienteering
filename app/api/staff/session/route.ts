import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export async function GET() {
  try {
    const cookieStore = cookies()
    const staffId = cookieStore.get("staff_id")?.value
    const staffName = cookieStore.get("staff_name")?.value
    const staffSession = cookieStore.get("staff_session")?.value

    console.log("Staff session check:", { staffId, staffName, staffSession })

    // セッションCookieがない場合
    if (!staffId || !staffName) {
      // ローカルストレージからの認証情報があるか確認（クライアントサイドでのみ可能）
      return NextResponse.json({
        authenticated: false,
        message: "スタッフセッションが見つかりません",
      })
    }

    // 緊急用の管理者アカウント
    if (staffId === "999" && staffName === "Admin") {
      return NextResponse.json({
        authenticated: true,
        staff: {
          id: 999,
          name: "Admin",
        },
      })
    }

    // Supabaseクライアントを作成
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // スタッフIDが有効かどうかを確認
    const { data: staff, error } = await supabase.from("staff").select("id, name").eq("id", staffId).single()

    if (error || !staff) {
      console.error("スタッフ検証エラー:", error)
      return NextResponse.json({
        authenticated: false,
        message: "スタッフ情報の検証に失敗しました",
        debug: { error, staffId },
      })
    }

    return NextResponse.json({
      authenticated: true,
      staff: {
        id: staff.id,
        name: staff.name,
      },
    })
  } catch (error) {
    console.error("セッション確認エラー:", error)
    return NextResponse.json(
      {
        authenticated: false,
        message: "セッション確認中にエラーが発生しました",
        debug: { error: error instanceof Error ? error.message : String(error) },
      },
      { status: 500 },
    )
  }
}

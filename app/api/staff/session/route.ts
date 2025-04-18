import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export async function GET() {
  try {
    const cookieStore = cookies()
    const staffSession = cookieStore.get("staff_session")

    if (!staffSession || !staffSession.value) {
      return NextResponse.json({ authenticated: false, error: "セッションが見つかりません" }, { status: 401 })
    }

    try {
      const session = JSON.parse(staffSession.value)
      const { staff_id, staff_name } = session

      if (!staff_id) {
        return NextResponse.json({ authenticated: false, error: "無効なセッション" }, { status: 401 })
      }

      // Supabaseでスタッフ情報を確認
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      const { data: staff, error } = await supabase.from("staff").select("*").eq("id", staff_id).single()

      if (error || !staff) {
        return NextResponse.json(
          { authenticated: false, error: "スタッフが見つかりません", debug: { error } },
          { status: 401 },
        )
      }

      return NextResponse.json({
        authenticated: true,
        staff: {
          id: staff.id,
          name: staff.name,
          checkpoint_id: staff.checkpoint_id,
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "セッションの解析に失敗しました",
          debug: error instanceof Error ? error.message : String(error),
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json(
      {
        authenticated: false,
        error: "セッション確認中にエラーが発生しました",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

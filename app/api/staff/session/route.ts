import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    console.log("セッションチェック開始")
    const cookieStore = cookies()
    const staffSession = cookieStore.get("staff_session")

    console.log("スタッフセッションCookieの存在:", !!staffSession)

    if (!staffSession || !staffSession.value) {
      // セッションCookieがない場合、他のCookieをチェック
      const staffId = cookieStore.get("staff_id")
      const staffName = cookieStore.get("staff_name")
      const staffCheckpointId = cookieStore.get("staff_checkpoint_id")

      console.log("Alternative cookies:", { staffId: !!staffId, staffName: !!staffName })

      if (staffId && staffName) {
        // バックアップCookieから情報を取得してセッションを再構築
        console.log("バックアップCookieから再構築を試行")

        return NextResponse.json({
          authenticated: true,
          staff: {
            id: staffId.value,
            name: staffName.value,
            checkpoint_id: staffCheckpointId?.value ? Number(staffCheckpointId.value) : null,
          },
          source: "backup_cookies",
        })
      }

      return NextResponse.json({ authenticated: false, error: "セッションが見つかりません" }, { status: 401 })
    }

    try {
      const session = JSON.parse(staffSession.value)
      const { staff_id, staff_name, checkpoint_id } = session

      console.log("パースしたセッション:", { staff_id, staff_name, checkpoint_id })

      if (!staff_id) {
        return NextResponse.json({ authenticated: false, error: "無効なセッション" }, { status: 401 })
      }

      if (!supabaseServer) {
        return NextResponse.json({
          authenticated: true,
          staff: {
            id: staff_id,
            name: staff_name,
            checkpoint_id: checkpoint_id ?? null,
          },
          source: "session_without_db",
        })
      }

      const { data: staff, error } = await supabaseServer.from("staff").select("id, name, checkpoint_id").eq("id", staff_id).maybeSingle()

      if (error) {
        console.log("Supabaseスタッフ情報取得エラー:", error)

        // Supabaseで失敗しても、セッションデータがあれば認証を許可
        return NextResponse.json({
          authenticated: true,
          staff: {
            id: staff_id,
            name: staff_name,
            checkpoint_id: checkpoint_id ?? null,
          },
          source: "session_only",
        })
      }

      if (!staff) {
        console.log("スタッフが見つからないが、セッションは有効")

        // スタッフレコードが見つからなくても、セッションがあれば認証を許可
        return NextResponse.json({
          authenticated: true,
          staff: {
            id: staff_id,
            name: staff_name,
            checkpoint_id: checkpoint_id ?? null,
          },
          source: "session_fallback",
        })
      }

      console.log("認証成功:", staff.name)
      return NextResponse.json({
        authenticated: true,
        staff: {
          id: staff.id,
          name: staff.name,
          checkpoint_id: staff.checkpoint_id,
        },
        source: "full_validation",
      })
    } catch (error) {
      console.log("セッション解析エラー:", error)
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
    console.error("セッション確認中の予期しないエラー:", error)
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

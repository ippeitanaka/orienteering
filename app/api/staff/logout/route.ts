import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // スタッフセッションCookieを削除
    cookies().delete("staff_session")
    cookies().delete("staff_id")
    cookies().delete("staff_name")

    return NextResponse.json({ success: true, message: "ログアウトしました" })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "ログアウト処理中にエラーが発生しました",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

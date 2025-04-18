import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    cookies().delete("staff_id")
    cookies().delete("staff_name")
    cookies().delete("staff_session")

    return NextResponse.json({ success: true, message: "ログアウト成功" })
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

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const cookieStore = cookies()

  // チームセッションCookieを削除
  cookieStore.delete("team_session")

  return NextResponse.json({ success: true })
}

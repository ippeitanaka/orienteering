import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { team_code } = requestData

    console.log("Team login attempt:", { team_code })

    if (!team_code) {
      return NextResponse.json({ error: "チームコードが必要です" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // チームコードでチームを検索
    const { data: team, error } = await supabase.from("teams").select("*").eq("team_code", team_code).single()

    console.log("Team query result:", { team, error })

    if (error || !team) {
      console.error("チーム認証エラー:", error)
      return NextResponse.json({ error: "チームコードが無効です" }, { status: 401 })
    }

    // セッションにチーム情報を保存
    const session = {
      team_id: team.id,
      team_name: team.name,
      team_code: team.team_code,
    }

    // セッションCookieを設定
    const response = NextResponse.json({
      success: true,
      message: "ログイン成功",
      team: {
        id: team.id,
        name: team.name,
        team_code: team.team_code,
      },
    })

    // セキュアなCookieにセッション情報を保存
    response.cookies.set({
      name: "team_session",
      value: JSON.stringify(session),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24時間
    })

    return response
  } catch (error) {
    console.error("チームログインエラー:", error)
    return NextResponse.json(
      {
        error: "ログイン処理中にエラーが発生しました",
        debug: { error: error instanceof Error ? error.message : String(error) },
      },
      { status: 500 },
    )
  }
}

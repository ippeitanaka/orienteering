import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { team_code, deviceId } = requestData

    console.log("Team login attempt:", { team_code, hasDeviceId: !!deviceId })

    if (!team_code) {
      return NextResponse.json({ error: "チームコードが必要です" }, { status: 400 })
    }

    if (!supabaseServer) {
      return NextResponse.json(
        {
          error: "データベース接続が利用できません",
          debug: {
            message: "supabaseServer is null or undefined",
            env: {
              hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        },
        { status: 500 },
      )
    }

    let normalizedTeam: any = null
    const { data: teamByCode, error } = await supabaseServer.from("teams").select("*").eq("team_code", team_code).maybeSingle()

    console.log("Team query result:", { team: teamByCode, error })

    if (teamByCode) {
      normalizedTeam = teamByCode
    } else {
      const teamId = Number.parseInt(team_code)
      if (!isNaN(teamId)) {
        const { data: teamById, error: errorById } = await supabaseServer
          .from("teams")
          .select("*")
          .eq("id", teamId)
          .maybeSingle()

        if (errorById || !teamById) {
          return NextResponse.json(
            {
              error: "チームコードが無効です",
              debug: { error, errorById, team_code },
            },
            { status: 401 },
          )
        }

        normalizedTeam = teamById
      } else {
        return NextResponse.json(
          {
            error: "チームコードが無効です",
            debug: { error, team_code },
          },
          { status: 401 },
        )
      }
    }

    // セッションにチーム情報を保存
    const session = {
      team_id: normalizedTeam.id,
      team_name: normalizedTeam.name,
      team_code: normalizedTeam.team_code,
      device_id: typeof deviceId === "string" ? deviceId : null,
    }

    // セッションCookieを設定
    const response = NextResponse.json({
      success: true,
      message: "ログイン成功",
      team: {
        id: normalizedTeam.id,
        name: normalizedTeam.name,
        team_code: normalizedTeam.team_code,
        color: normalizedTeam.color,
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

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

export async function GET() {
  try {
    const cookieStore = cookies()
    const teamSession = cookieStore.get("team_session")

    if (!teamSession || !teamSession.value) {
      return NextResponse.json({ authenticated: false, error: "セッションが見つかりません" }, { status: 401 })
    }

    try {
      const session = JSON.parse(teamSession.value)
      const { team_id, team_name } = session

      if (!team_id) {
        return NextResponse.json({ authenticated: false, error: "無効なセッション" }, { status: 401 })
      }

      // Supabaseでチーム情報を確認
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      const { data: team, error } = await supabase.from("teams").select("*").eq("id", team_id).single()

      if (error || !team) {
        return NextResponse.json(
          { authenticated: false, error: "チームが見つかりません", debug: { error } },
          { status: 401 },
        )
      }

      return NextResponse.json({
        authenticated: true,
        team: {
          id: team.id,
          name: team.name,
          team_code: team.team_code,
          color: team.color,
          total_score: team.total_score,
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

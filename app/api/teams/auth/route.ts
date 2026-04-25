import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

const LOCK_TIMEOUT_MINUTES = 10

const isTeamLockTableMissing = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        (typeof error.message === "string" && error.message.includes("team_location_locks"))),
  )

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { team_code, deviceId } = requestData

    console.log("Team login attempt:", { team_code, hasDeviceId: !!deviceId })

    if (!team_code) {
      return NextResponse.json({ error: "チームコードが必要です" }, { status: 400 })
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ error: "端末識別子が必要です。再度ログインしてください。" }, { status: 400 })
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

    const { data: existingLock, error: lockError } = await supabaseServer
      .from("team_location_locks")
      .select("team_id, device_id, last_seen")
      .eq("team_id", normalizedTeam.id)
      .maybeSingle()

    const lockTableMissing = isTeamLockTableMissing(lockError)
    if (lockError && !lockTableMissing) {
      console.error("Error fetching team device lock:", lockError)
      return NextResponse.json({ error: lockError.message }, { status: 500 })
    }

    if (!lockTableMissing) {
      const now = new Date()
      const lockExpiredAt = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000)

      if (existingLock) {
        const isSameDevice = existingLock.device_id === deviceId
        const isExpired = new Date(existingLock.last_seen) < lockExpiredAt

        if (!isSameDevice && !isExpired) {
          return NextResponse.json(
            {
              error: "このチームは別の端末でログイン中です。QRコードの読み取りは1端末のみ利用できます。",
              code: "DEVICE_LOCKED",
            },
            { status: 409 },
          )
        }

        const { error: updateLockError } = await supabaseServer
          .from("team_location_locks")
          .update({
            device_id: deviceId,
            last_seen: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("team_id", normalizedTeam.id)

        if (updateLockError) {
          console.error("Error updating team device lock:", updateLockError)
          return NextResponse.json({ error: updateLockError.message }, { status: 500 })
        }
      } else {
        const now = new Date()
        const { error: insertLockError } = await supabaseServer.from("team_location_locks").insert([
          {
            team_id: normalizedTeam.id,
            device_id: deviceId,
            last_seen: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ])

        if (insertLockError) {
          console.error("Error creating team device lock:", insertLockError)
          return NextResponse.json({ error: insertLockError.message }, { status: 500 })
        }
      }
    }

    // セッションにチーム情報を保存
    const session = {
      team_id: normalizedTeam.id,
      team_name: normalizedTeam.name,
      team_code: normalizedTeam.team_code,
      device_id: deviceId,
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

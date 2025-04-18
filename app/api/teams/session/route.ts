import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const teamSessionCookie = cookieStore.get("team_session")

    if (!teamSessionCookie) {
      return NextResponse.json({ authenticated: false })
    }

    try {
      const session = JSON.parse(teamSessionCookie.value)
      return NextResponse.json({
        authenticated: true,
        team: {
          id: session.team_id,
          name: session.team_name,
          team_code: session.team_code,
        },
      })
    } catch (e) {
      return NextResponse.json({ authenticated: false, error: "Invalid session format" })
    }
  } catch (error) {
    console.error("Team session check error:", error)
    return NextResponse.json({ authenticated: false, error: "Session check failed" })
  }
}

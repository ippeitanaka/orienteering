import { type NextRequest, NextResponse } from "next/server"
import { getTimer, startTimer, stopTimer, resetTimer } from "@/lib/supabase"

// タイマー情報を取得するAPI
export async function GET() {
  try {
    const timer = await getTimer()

    if (!timer) {
      return NextResponse.json({ success: false, message: "タイマー情報の取得に失敗しました" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: timer })
  } catch (error) {
    console.error("Error in GET /api/timer:", error)
    return NextResponse.json({ success: false, message: "タイマー情報の取得中にエラーが発生しました" }, { status: 500 })
  }
}

// タイマーを操作するAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, duration } = body

    let result

    switch (action) {
      case "start":
        if (!duration || isNaN(duration) || duration <= 0) {
          return NextResponse.json({ success: false, message: "有効な制限時間を指定してください" }, { status: 400 })
        }
        result = await startTimer(duration)
        break
      case "stop":
        result = await stopTimer()
        break
      case "reset":
        result = await resetTimer()
        break
      default:
        return NextResponse.json({ success: false, message: "無効なアクションです" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in POST /api/timer:", error)
    return NextResponse.json({ success: false, message: "タイマー操作中にエラーが発生しました" }, { status: 500 })
  }
}

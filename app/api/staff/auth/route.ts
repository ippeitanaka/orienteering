import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { name, passcode } = requestData

    console.log("Staff login attempt:", { name, passcode })

    if (!name || !passcode) {
      return NextResponse.json(
        {
          success: false,
          error: "スタッフ名とパスワードを入力してください",
          debug: { missingFields: { name: !name, passcode: !passcode } },
        },
        { status: 400 },
      )
    }

    if (!supabaseServer) {
      return NextResponse.json(
        {
          success: false,
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

    // スタッフテーブルの全レコードを取得（デバッグ用）
    const { data: allStaff, error: allStaffError } = await supabaseServer.from("staff").select("*")
    console.log("All staff records:", allStaff?.length || 0, "Error:", allStaffError)

    // スタッフテーブルからユーザーを検索
    const { data: staff, error } = await supabaseServer
      .from("staff")
      .select("*")
      .eq("name", name)
      .eq("password", passcode)
      .single()

    console.log("Staff query result:", { staff: staff ? "found" : "not found", error })

    // 緊急用のフォールバック認証
    if ((error || !staff) && name === "admin" && passcode === "admin123") {
      console.log("Using emergency fallback authentication")

      // 認証成功時
      cookies().set("staff_id", "999", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1週間
      })

      cookies().set("staff_name", "Admin", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1週間
      })

      // セッションCookieを設定
      const session = {
        staff_id: 999,
        staff_name: "Admin",
      }

      const response = NextResponse.json({
        success: true,
        message: "緊急ログイン成功",
        data: { id: 999, name: "Admin", password: "admin123", checkpoint_id: null },
      })

      response.cookies.set({
        name: "staff_session",
        value: JSON.stringify(session),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1週間
      })

      return response
    }

    if (error || !staff) {
      return NextResponse.json(
        {
          success: false,
          error: "スタッフ名またはパスワードが正しくありません",
          debug: {
            queriedName: name,
            staffCount: allStaff?.length || 0,
            lastError: error,
            allStaff: allStaff?.map((s) => ({ id: s.id, name: s.name })),
          },
        },
        { status: 401 },
      )
    }

    // 認証成功時
    cookies().set("staff_id", staff.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1週間
    })

    cookies().set("staff_name", staff.name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1週間
    })

    // セッションCookieを設定
    const session = {
      staff_id: staff.id,
      staff_name: staff.name,
    }

    const response = NextResponse.json({
      success: true,
      message: "ログイン成功",
      data: staff,
    })

    response.cookies.set({
      name: "staff_session",
      value: JSON.stringify(session),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1週間
    })

    return response
  } catch (error) {
    console.error("Staff login error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "ログイン処理中にエラーが発生しました",
        debug: { error: error instanceof Error ? error.message : String(error) },
      },
      { status: 500 },
    )
  }
}

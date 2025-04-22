import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { name, passcode } = requestData

    console.log("スタッフログイン試行:", { name, passcode: "***" })

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
      console.error("Supabaseサーバー接続が利用できません")
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

    // スタッフテーブルからユーザーを検索
    const { data: staff, error } = await supabaseServer
      .from("staff")
      .select("*")
      .eq("name", name)
      .eq("password", passcode)
      .single()

    console.log("スタッフ検索結果:", { found: !!staff, error: !!error })

    // 緊急用のフォールバック認証
    if ((error || !staff) && name === "admin" && passcode === "admin123") {
      console.log("緊急フォールバック認証を使用")

      const sessionData = {
        staff_id: 999,
        staff_name: "Admin",
      }

      // Cookieを設定
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

      cookies().set("staff_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1週間
      })

      console.log("セッションCookieを設定済み(admin)")

      return NextResponse.json({
        success: true,
        message: "緊急ログイン成功",
        data: { id: 999, name: "Admin", checkpoint_id: null },
      })
    }

    if (error || !staff) {
      console.log("認証失敗:", error)
      return NextResponse.json(
        {
          success: false,
          error: "スタッフ名またはパスワードが正しくありません",
          debug: { error },
        },
        { status: 401 },
      )
    }

    // 認証成功時
    const sessionData = {
      staff_id: staff.id,
      staff_name: staff.name,
    }

    // Cookieを設定
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

    cookies().set("staff_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1週間
    })

    console.log("セッションCookieを設定済み:", staff.name)

    return NextResponse.json({
      success: true,
      message: "ログイン成功",
      data: staff,
    })
  } catch (error) {
    console.error("スタッフログインエラー:", error)
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

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // スタッフテーブルのデータを確認
    const { data: staffData, error: staffError } = await supabase.from("staff").select("*")

    if (staffError) {
      return NextResponse.json(
        {
          success: false,
          error: "スタッフテーブルの確認に失敗しました",
          details: staffError,
        },
        { status: 500 },
      )
    }

    // スタッフデータが存在しない場合は作成
    if (!staffData || staffData.length === 0) {
      const defaultStaff = [
        { id: 10, name: "elt10", password: "elt10", checkpoint_id: null },
        { id: 11, name: "elt11", password: "elt11", checkpoint_id: null },
        { id: 12, name: "elt12", password: "elt12", checkpoint_id: null },
        { id: 13, name: "elt13", password: "elt13", checkpoint_id: null },
        { id: 14, name: "elt14", password: "elt14", checkpoint_id: null },
        { id: 15, name: "elt15", password: "elt15", checkpoint_id: null },
        { id: 16, name: "elt16", password: "elt16", checkpoint_id: null },
        { id: 17, name: "elt17", password: "elt17", checkpoint_id: null },
        { id: 18, name: "elt18", password: "elt18", checkpoint_id: null },
        { id: 19, name: "elt19", password: "elt19", checkpoint_id: null },
        { id: 20, name: "elt20", password: "elt20", checkpoint_id: null },
        { id: 999, name: "admin", password: "admin123", checkpoint_id: null },
      ]

      const { data: insertedStaff, error: insertError } = await supabase.from("staff").insert(defaultStaff).select()

      if (insertError) {
        return NextResponse.json(
          {
            success: false,
            error: "スタッフデータの作成に失敗しました",
            details: insertError,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "スタッフデータを作成しました",
        data: { staffCount: insertedStaff.length },
      })
    }

    return NextResponse.json({
      success: true,
      message: "スタッフデータは既に存在します",
      data: { staffCount: staffData.length },
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "セットアップ中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

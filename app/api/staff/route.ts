import { NextResponse } from "next/server"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get("id")

  if (!staffId) {
    return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
  }

  // Supabaseが設定されているか確認
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  try {
    // テーブル構造を確認
    const { data: columns } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_schema", "public")
      .eq("table_name", "staff")

    console.log("Staff table columns:", columns)

    // .single() を使わずに通常のクエリを実行し、結果を確認
    const { data, error } = await supabase.from("staff").select("*, checkpoints(*)").eq("id", staffId)

    if (error) {
      console.error("Error fetching staff:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    // 最初の結果を返す
    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json({ error: "Failed to fetch staff data" }, { status: 500 })
  }
}

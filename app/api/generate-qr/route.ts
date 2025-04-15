import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const checkpointId = searchParams.get("checkpoint")

  if (!checkpointId) {
    return NextResponse.json({ error: "Checkpoint ID is required" }, { status: 400 })
  }

  // チェックポイントが存在するか確認
  const { data: checkpoint, error } = await supabase.from("checkpoints").select("*").eq("id", checkpointId).single()

  if (error || !checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 })
  }

  // QRコードのURLを生成
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com"
  const qrUrl = `${appUrl}/checkpoint/${checkpointId}`

  return NextResponse.json({
    checkpointId,
    checkpointName: checkpoint.name,
    qrUrl,
  })
}

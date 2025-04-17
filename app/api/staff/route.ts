import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get("id")

  if (!staffId) {
    return NextResponse.json({ error: "Staff ID is required" }, { status: 400 })
  }

  // Supabaseサーバークライアントが利用可能か確認
  if (!supabaseServer) {
    console.error("Supabase server client is not available")
    return NextResponse.json(
      {
        error: "Database connection not available",
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

  try {
    console.log(`Fetching staff with ID: ${staffId}`)

    // まず、スタッフが存在するか確認
    const { data, error } = await supabaseServer.from("staff").select("*").eq("id", staffId).limit(1)

    console.log("Staff query result:", { data, error })

    if (error) {
      console.error("Error fetching staff:", error)
      return NextResponse.json(
        {
          error: error.message,
          debug: { error },
        },
        { status: 500 },
      )
    }

    // スタッフが見つからない場合、デフォルトのスタッフレコードを作成
    if (!data || data.length === 0) {
      console.log(`Staff with ID ${staffId} not found. Creating a default staff record.`)

      // デフォルトのスタッフデータを準備
      const defaultStaffData = {
        name: "Default Staff",
        password: "password123",
      }

      // IDを指定する場合（注意: これはシーケンスを壊す可能性があります）
      if (Number(staffId) > 0) {
        // @ts-ignore - idを明示的に設定
        defaultStaffData.id = Number(staffId)
      }

      console.log("Creating default staff with data:", defaultStaffData)

      const { data: newStaff, error: createError } = await supabaseServer
        .from("staff")
        .insert([defaultStaffData])
        .select()

      if (createError) {
        console.error("Error creating default staff:", createError)

        // 既に同じIDのレコードが存在する場合は、再度取得を試みる
        if (createError.code === "23505") {
          // 一意性制約違反
          console.log("Staff record with this ID might already exist. Trying to fetch again.")
          const { data: existingStaff, error: fetchError } = await supabaseServer
            .from("staff")
            .select("*")
            .eq("id", staffId)
            .limit(1)

          if (fetchError || !existingStaff || existingStaff.length === 0) {
            return NextResponse.json(
              {
                error: "Staff not found and could not create default staff",
                debug: { createError, fetchError },
              },
              { status: 404 },
            )
          }

          return NextResponse.json({
            data: existingStaff[0],
            message: "Found existing staff record after insert conflict",
          })
        }

        return NextResponse.json(
          {
            error: "Could not create default staff",
            debug: { createError },
          },
          { status: 500 },
        )
      }

      if (!newStaff || newStaff.length === 0) {
        return NextResponse.json(
          {
            error: "Failed to create staff record",
            debug: { newStaff },
          },
          { status: 500 },
        )
      }

      // 作成したスタッフレコードを返す
      return NextResponse.json({
        data: newStaff[0],
        message: "Created default staff record",
      })
    }

    // 既存のスタッフレコードを返す
    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error("Error in staff API:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch staff data",
        debug: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 },
    )
  }
}

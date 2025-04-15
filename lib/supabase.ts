import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// 環境変数が存在するか確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// デバッグ情報
console.log("NEXT_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl)
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey)

// Supabaseクライアントを作成
let supabase: SupabaseClient | null = null
let supabaseAdmin: SupabaseClient | null = null

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log("Supabase client initialized successfully")

    // サービスロールキーが設定されている場合は管理者クライアントも作成
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      console.log("Supabase admin client initialized successfully")
    }
  } else {
    console.warn(
      "Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment variables.",
    )
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error)
}

// Supabaseが設定されているかどうかを確認する関数
export function isSupabaseConfigured(): boolean {
  // 環境変数の存在確認を単純化
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !!supabase
}

// 型定義
export type Team = {
  id: number
  name: string
  color: string
  total_score: number
}

export type Checkpoint = {
  id: number
  name: string
  description: string
  latitude: number
  longitude: number
  point_value: number
}

export type Checkin = {
  id: number
  team_id: number
  checkpoint_id: number
  timestamp: string
}

export type TeamLocation = {
  id: number
  team_id: number
  latitude: number
  longitude: number
  timestamp: string
}

// 実際のデータベース構造に合わせたStaff型定義
export type Staff = {
  id: number
  // 実際のカラム名を使用
  name?: string
  passcode?: string
  checkpoint_id: number | null
  checkpoints?: Checkpoint
}

// モックデータ（環境変数が設定されていない場合に使用）
const mockTeams: Team[] = [
  { id: 1, name: "レッドチーム", color: "#FF5252", total_score: 30 },
  { id: 2, name: "ブルーチーム", color: "#4285F4", total_score: 25 },
  { id: 3, name: "グリーンチーム", color: "#0F9D58", total_score: 20 },
]

const mockCheckpoints: Checkpoint[] = [
  {
    id: 1,
    name: "スタート地点",
    description: "オリエンテーションの開始地点です",
    latitude: 35.6895,
    longitude: 139.6917,
    point_value: 0,
  },
  {
    id: 2,
    name: "チェックポイント1",
    description: "最初のミッションポイント",
    latitude: 35.69,
    longitude: 139.6925,
    point_value: 10,
  },
]

// データ取得関数
export async function getTeams(): Promise<Team[]> {
  if (!isSupabaseConfigured()) {
    console.warn("Using mock data for teams because Supabase is not configured")
    return mockTeams
  }

  try {
    const { data, error } = await supabase!.from("teams").select("*").order("total_score", { ascending: false })

    if (error) {
      console.error("Error fetching teams:", error)
      return []
    }

    return data as Team[]
  } catch (error) {
    console.error("Error in getTeams:", error)
    return []
  }
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  if (!isSupabaseConfigured()) {
    console.warn("Using mock data for checkpoints because Supabase is not configured")
    return mockCheckpoints
  }

  try {
    const { data, error } = await supabase!.from("checkpoints").select("*")

    if (error) {
      console.error("Error fetching checkpoints:", error)
      return []
    }

    return data as Checkpoint[]
  } catch (error) {
    console.error("Error in getCheckpoints:", error)
    return []
  }
}

export async function getTeamCheckins(teamId: number) {
  if (!isSupabaseConfigured()) {
    console.warn("Using mock data for team checkins because Supabase is not configured")
    return []
  }

  try {
    const { data, error } = await supabase!.from("checkins").select("*, checkpoints(*)").eq("team_id", teamId)

    if (error) {
      console.error("Error fetching team checkins:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error in getTeamCheckins:", error)
    return []
  }
}

export async function checkInTeam(teamId: number, checkpointId: number) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        "Supabaseが正しく設定されていません。環境変数NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。",
    }
  }

  try {
    // チェックインが既に存在するか確認
    const { data: existingCheckin } = await supabase!
      .from("checkins")
      .select("*")
      .eq("team_id", teamId)
      .eq("checkpoint_id", checkpointId)
      .single()

    if (existingCheckin) {
      return { success: false, message: "このチェックポイントは既にチェックイン済みです" }
    }

    // チェックポイントの情報を取得
    const { data: checkpoint } = await supabase!
      .from("checkpoints")
      .select("point_value")
      .eq("id", checkpointId)
      .single()

    if (!checkpoint) {
      return { success: false, message: "チェックポイントが見つかりません" }
    }

    // チェックインを記録
    const { error: checkinError } = await supabase!
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return { success: false, message: "チェックインに失敗しました" }
    }

    // チームのスコアを更新
    const { error: updateError } = await supabase!.rpc("increment_team_score", {
      p_team_id: teamId,
      p_score: checkpoint.point_value,
    })

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return { success: false, message: "スコア更新に失敗しました" }
    }

    return { success: true, message: "チェックインが完了しました！" }
  } catch (error) {
    console.error("Error in checkInTeam:", error)
    return { success: false, message: "チェックイン処理中にエラーが発生しました" }
  }
}

export async function updateTeamLocation(teamId: number, latitude: number, longitude: number) {
  if (!isSupabaseConfigured()) {
    console.warn("Skipping team location update because Supabase is not configured")
    return false
  }

  try {
    const { error } = await supabase!.from("team_locations").insert([{ team_id: teamId, latitude, longitude }])

    if (error) {
      console.error("Error updating team location:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateTeamLocation:", error)
    return false
  }
}

export async function getTeamLocations() {
  if (!isSupabaseConfigured()) {
    console.warn("Using mock data for team locations because Supabase is not configured")
    return []
  }

  try {
    const { data, error } = await supabase!.from("team_locations").select("*").order("timestamp", { ascending: false })

    if (error) {
      console.error("Error fetching team locations:", error)
      return []
    }

    // 各チームの最新の位置情報のみを取得
    const latestLocations: Record<number, TeamLocation> = {}
    data.forEach((location: TeamLocation) => {
      if (
        !latestLocations[location.team_id] ||
        new Date(location.timestamp) > new Date(latestLocations[location.team_id].timestamp)
      ) {
        latestLocations[location.team_id] = location
      }
    })

    return Object.values(latestLocations)
  } catch (error) {
    console.error("Error in getTeamLocations:", error)
    return []
  }
}

// スタッフ認証関数
export async function verifyStaff(name: string, passcode: string) {
  if (!isSupabaseConfigured()) {
    console.warn("Cannot verify staff because Supabase is not configured")
    return null
  }

  try {
    console.log("Verifying staff with Supabase:", { name, passcode })

    // まず、staffテーブルの構造を確認
    const { data: tableInfo, error: tableError } = await supabase!.rpc("debug_table_info", { table_name: "staff" })
    console.log("Staff table structure:", tableInfo, tableError)

    // 実際のカラム名に合わせてクエリを修正
    // 複数のカラム名の組み合わせを試す
    let staffData = null
    let queryError = null

    // 試行1: nameとpasscodeを使用
    const { data: data1, error: error1 } = await supabase!
      .from("staff")
      .select("*")
      .eq("name", name)
      .eq("passcode", passcode)

    console.log("Query 1 result:", { data: data1, error: error1 })

    if (data1 && data1.length > 0) {
      staffData = data1[0]
    } else {
      queryError = error1
    }

    // 試行2: usernameとpasswordを使用
    if (!staffData) {
      const { data: data2, error: error2 } = await supabase!
        .from("staff")
        .select("*")
        .eq("username", name)
        .eq("password", passcode)

      console.log("Query 2 result:", { data: data2, error: error2 })

      if (data2 && data2.length > 0) {
        staffData = data2[0]
      } else if (!queryError) {
        queryError = error2
      }
    }

    // 試行3: emailとpasswordを使用
    if (!staffData) {
      const { data: data3, error: error3 } = await supabase!
        .from("staff")
        .select("*")
        .eq("email", name)
        .eq("password", passcode)

      console.log("Query 3 result:", { data: data3, error: error3 })

      if (data3 && data3.length > 0) {
        staffData = data3[0]
      } else if (!queryError) {
        queryError = error3
      }
    }

    console.log("Final verification result:", { staffData, queryError })

    return staffData
  } catch (error) {
    console.error("Error in verifyStaff:", error)
    return null
  }
}

export async function updateStaffCheckpoint(staffId: number, checkpointId: number) {
  if (!isSupabaseConfigured()) {
    console.warn("Skipping staff checkpoint update because Supabase is not configured")
    return false
  }

  try {
    const { error } = await supabase!.from("staff").update({ checkpoint_id: checkpointId }).eq("id", staffId)

    if (error) {
      console.error("Error updating staff checkpoint:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateStaffCheckpoint:", error)
    return false
  }
}

export async function staffCheckInTeam(teamId: number, checkpointId: number, points: number) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        "Supabaseが正しく設定されていません。環境変数NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。",
    }
  }

  try {
    const client = supabaseAdmin || supabase

    // チェックインが既に存在するか確認
    const { data: existingCheckin } = await client!
      .from("checkins")
      .select("*")
      .eq("team_id", teamId)
      .eq("checkpoint_id", checkpointId)
      .single()

    if (existingCheckin) {
      return { success: false, message: "このチェックポイントは既にチェックイン済みです" }
    }

    // チェックインを記録
    const { error: checkinError } = await client!
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return { success: false, message: `チェックインに失敗しました: ${checkinError.message}` }
    }

    // チームのスコアを更新
    const { error: updateError } = await client!.rpc("increment_team_score", {
      p_team_id: teamId,
      p_score: points,
    })

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return { success: false, message: `スコア更新に失敗しました: ${updateError.message}` }
    }

    return { success: true, message: "チェックインが完了しました！" }
  } catch (error) {
    console.error("Error in staffCheckInTeam:", error)
    return { success: false, message: "チェックイン処理中にエラーが発生しました" }
  }
}

// 新しく追加する関数

// チェックポイントを作成する関数
export async function createCheckpoint(checkpointData: Omit<Checkpoint, "id">) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client!.from("checkpoints").insert([checkpointData]).select()

    if (error) {
      console.error("Error creating checkpoint:", error)
      return { success: false, message: `チェックポイントの作成に失敗しました: ${error.message}` }
    }

    return { success: true, message: "チェックポイントを作成しました", data: data[0] }
  } catch (error) {
    console.error("Error in createCheckpoint:", error)
    return { success: false, message: "チェックポイント作成中にエラーが発生しました" }
  }
}

// チェックポイントを更新する関数
export async function updateCheckpoint(id: number, checkpointData: Partial<Checkpoint>) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase
    const { error } = await client!.from("checkpoints").update(checkpointData).eq("id", id)

    if (error) {
      console.error("Error updating checkpoint:", error)
      return { success: false, message: `チェックポイントの更新に失敗しました: ${error.message}` }
    }

    return { success: true, message: "チェックポイントを更新しました" }
  } catch (error) {
    console.error("Error in updateCheckpoint:", error)
    return { success: false, message: "チェックポイント更新中にエラーが発生しました" }
  }
}

// チェックポイントを削除する関数
export async function deleteCheckpoint(id: number) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase
    const { error } = await client!.from("checkpoints").delete().eq("id", id)

    if (error) {
      console.error("Error deleting checkpoint:", error)
      return { success: false, message: `チェックポイントの削除に失敗しました: ${error.message}` }
    }

    return { success: true, message: "チェックポイントを削除しました" }
  } catch (error) {
    console.error("Error in deleteCheckpoint:", error)
    return { success: false, message: "チェックポイント削除中にエラーが発生しました" }
  }
}

// チームを作成する関数
export async function createTeam(teamData: Omit<Team, "id" | "total_score">) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    // 管理者クライアントが利用可能な場合はそれを使用
    const client = supabaseAdmin || supabase

    const { data, error } = await client!
      .from("teams")
      .insert([{ ...teamData, total_score: 0 }])
      .select()

    if (error) {
      console.error("Error creating team:", error)
      return { success: false, message: `チームの作成に失敗しました: ${error.message}` }
    }

    return { success: true, message: "チームを作成しました", data: data[0] }
  } catch (error) {
    console.error("Error in createTeam:", error)
    return { success: false, message: "チーム作成中にエラーが発生しました" }
  }
}

// チームを更新する関数
export async function updateTeam(id: number, teamData: Partial<Team>) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase

    // 更新操作を実行
    const { error } = await client!.from("teams").update(teamData).eq("id", id)

    if (error) {
      console.error("Error updating team:", error)
      return { success: false, message: `チームの更新に失敗しました: ${error.message}` }
    }

    // 更新後のデータを取得
    const { data: updatedData, error: fetchError } = await client!.from("teams").select("*").eq("id", id).single()

    if (fetchError || !updatedData) {
      console.error("Error fetching updated team:", fetchError)
      return { success: true, message: "チームを更新しましたが、最新データの取得に失敗しました" }
    }

    return { success: true, message: "チームを更新しました", data: updatedData }
  } catch (error) {
    console.error("Error in updateTeam:", error)
    return { success: false, message: "チーム更新中にエラーが発生しました" }
  }
}

// チームを削除する関数
export async function deleteTeam(id: number) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase
    const { error } = await client!.from("teams").delete().eq("id", id)

    if (error) {
      console.error("Error deleting team:", error)
      return { success: false, message: `チームの削除に失敗しました: ${error.message}` }
    }

    return { success: true, message: "チームを削除しました" }
  } catch (error) {
    console.error("Error in deleteTeam:", error)
    return { success: false, message: "チーム削除中にエラーが発生しました" }
  }
}

// 特定のチェックポイントでチェックインしていないチームを取得する関数
export async function getUncheckedTeams(checkpointId: number) {
  if (!isSupabaseConfigured()) {
    console.warn("Using mock data for unchecked teams because Supabase is not configured")
    return mockTeams
  }

  try {
    // すでにチェックインしているチームのIDを取得
    const { data: checkins, error: checkinsError } = await supabase!
      .from("checkins")
      .select("team_id")
      .eq("checkpoint_id", checkpointId)

    if (checkinsError) {
      console.error("Error fetching checkins:", checkinsError)
      return []
    }

    const checkedTeamIds = checkins.map((checkin) => checkin.team_id)

    // チェックインしていないチームを取得
    let query = supabase!.from("teams").select("*")

    if (checkedTeamIds.length > 0) {
      query = query.not("id", "in", `(${checkedTeamIds.join(",")})`)
    }

    const { data: teams, error: teamsError } = await query.order("name")

    if (teamsError) {
      console.error("Error fetching unchecked teams:", teamsError)
      return []
    }

    return teams as Team[]
  } catch (error) {
    console.error("Error in getUncheckedTeams:", error)
    return []
  }
}

// QRコードのURLを生成する関数
export function generateQRCodeUrl(checkpointId: number) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  return `${baseUrl}/checkpoint/${checkpointId}`
}

// スタッフを追加する関数
export async function createStaff(staffData: Omit<Staff, "id">) {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Supabaseが正しく設定されていません" }
  }

  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client!.from("staff").insert([staffData]).select()

    if (error) {
      console.error("Error creating staff:", error)
      return { success: false, message: `スタッフの作成に失敗しました: ${error.message}` }
    }

    return { success: true, message: "スタッフを作成しました", data: data[0] }
  } catch (error) {
    console.error("Error in createStaff:", error)
    return { success: false, message: "スタッフ作成中にエラーが発生しました" }
  }
}

// スタッフ一覧を取得する関数
export async function getStaff() {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase!.from("staff").select("*, checkpoints(*)")

    if (error) {
      console.error("Error fetching staff:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Error in getStaff:", error)
    return []
  }
}

// Supabaseクライアントをエクスポート（テスト用）
export { supabase, supabaseAdmin }

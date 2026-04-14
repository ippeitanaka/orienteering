import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 環境変数が設定されていない場合はダミークライアントを作成（ビルド時のエラー回避用）
const createSupabaseClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseKey) {
    // ビルド時に環境変数がない場合、ダミーURLでクライアントを作成
    // 実行時にはエラーがスローされるが、ビルドは通る
    return createClient("https://placeholder.supabase.co", "placeholder-key")
  }
  return createClient(supabaseUrl, supabaseKey)
}

export const supabase = createSupabaseClient()

// Supabase接続が有効かどうかを確認するヘルパー関数
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseKey)
}

export interface Checkpoint {
  id: number
  created_at: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  point_value: number
  is_moving?: boolean
  assigned_staff_id?: number | null
  assigned_staff_name?: string | null
  location_source?: "static" | "staff" | "static-fallback"
  base_latitude?: number
  base_longitude?: number
  last_location_update?: string | null
  qr_token?: string | null
}

export interface Team {
  id: number
  created_at: string
  name: string
  color: string
  total_score: number
  team_code: string | null
}

export interface TeamLocation {
  id: number
  created_at: string
  team_id: number
  latitude: number
  longitude: number
  timestamp: string
  accuracy?: number | null
}

export interface StaffMember {
  id: number
  name: string
  checkpoint_id: number | null
}

export interface EventReportSummary {
  generatedAt: string
  eventStatus: "running" | "finished" | "not_started"
  timer: TimerSettings | null
  totalTeams: number
  totalCheckpoints: number
  totalCheckins: number
  movingCheckpointCount: number
  averageCheckinsPerTeam: number
  topTeamName: string | null
  topScore: number
  lastCheckinAt: string | null
}

export interface EventReportTeamRow {
  rank: number
  teamId: number
  teamName: string
  teamColor: string
  score: number
  checkins: number
  checkpointsVisited: string[]
  firstCheckinAt: string | null
  lastCheckinAt: string | null
}

export interface EventReportCheckpointRow {
  checkpointId: number
  checkpointName: string
  pointValue: number
  visits: number
  uniqueTeams: number
  isMoving: boolean
  assignedStaffName: string | null
}

export interface EventReport {
  summary: EventReportSummary
  teams: EventReportTeamRow[]
  checkpoints: EventReportCheckpointRow[]
}

// 既存の型定義に追加
export interface TimerSettings {
  id: number
  duration: number // 秒単位
  end_time: string | null // タイマーの終了時刻（ISO形式）
  is_running: boolean
  created_at: string
  updated_at: string
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  const response = await fetch("/api/checkpoints", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch checkpoints")
  }

  return result.data || []
}

export async function getTeamLocations(): Promise<TeamLocation[]> {
  const response = await fetch("/api/team-locations", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch team locations")
  }

  return result.data || []
}

export async function updateStaffLocation(staffId: number, latitude: number, longitude: number): Promise<any> {
  const response = await fetch("/api/staff-location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ staffId, latitude, longitude }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to update staff location")
  }

  return result
}

export async function updateTeamLocation(
  teamId: number,
  latitude: number,
  longitude: number,
  deviceId?: string,
  accuracy?: number | null,
): Promise<any> {
  try {
    const response = await fetch("/api/team-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teamId, latitude, longitude, deviceId, accuracy }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || `API responded with status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error("Error in updateTeamLocation:", error)
    throw error
  }
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("total_score", { ascending: false })
  if (error) {
    console.error("Error fetching teams:", error)
    throw error
  }
  return data || []
}

export async function getStaffMembers(): Promise<StaffMember[]> {
  const response = await fetch("/api/staff", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch staff members")
  }

  return result.data || []
}

export async function getTeamCheckins(teamId: number): Promise<any[]> {
  const { data, error } = await supabase.from("checkins").select("*").eq("team_id", teamId)
  if (error) {
    console.error("Error fetching team checkins:", error)
    throw error
  }
  return data || []
}

export async function getUncheckedTeams(checkpointId: number): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .not("id", "in", `select team_id from checkins where checkpoint_id = ${checkpointId}`)

  if (error) {
    console.error("Error fetching unchecked teams:", error)
    throw error
  }

  return data || []
}

export async function staffCheckInTeam(
  teamId: number,
  checkpointId: number,
  points: number,
): Promise<{ success: boolean; message: string }> {
  try {
    // トランザクションを開始
    await supabase.rpc("start_transaction")

    // 1. checkinsテーブルにレコードを挿入
    const { error: checkinsError } = await supabase
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinsError) {
      throw checkinsError
    }

    // 2. teamsテーブルのtotal_scoreを更新
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("total_score")
      .eq("id", teamId)
      .single()

    if (teamError) {
      throw teamError
    }

    const currentScore = team?.total_score || 0
    const newScore = currentScore + points

    const { error: updateError } = await supabase.from("teams").update({ total_score: newScore }).eq("id", teamId)

    if (updateError) {
      throw updateError
    }

    // トランザクションをコミット
    await supabase.rpc("commit_transaction")

    return { success: true, message: "チェックインが完了しました" }
  } catch (error: any) {
    // エラーが発生した場合はトランザクションをロールバック
    await supabase.rpc("rollback_transaction")
    console.error("Error checking in team:", error)
    return { success: false, message: "チェックイン処理中にエラーが発生しました" }
  }
}

export async function createCheckpoint(
  checkpointData: any,
): Promise<{ success: boolean; message: string; data?: Checkpoint }> {
  try {
    const response = await fetch("/api/checkpoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkpointData),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return { success: false, message: result.error || "チェックポイントの作成に失敗しました" }
    }

    return { success: true, message: result.message || "チェックポイントを作成しました", data: result.data }
  } catch (error: any) {
    console.error("Error creating checkpoint:", error)
    return { success: false, message: error.message }
  }
}

export async function updateCheckpoint(
  checkpointId: number,
  checkpointData: any,
): Promise<{ success: boolean; message: string; data?: Checkpoint }> {
  try {
    const response = await fetch(`/api/checkpoints/${checkpointId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkpointData),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return { success: false, message: result.error || "チェックポイントの更新に失敗しました" }
    }

    return { success: true, message: result.message || "チェックポイントを更新しました", data: result.data }
  } catch (error: any) {
    console.error("Error updating checkpoint:", error)
    return { success: false, message: error.message }
  }
}

export async function getTimerSettings(): Promise<TimerSettings | null> {
  try {
    const { data, error } = await supabase
      .from("timer_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching timer settings:", error)
      throw error
    }

    return data?.[0] || null
  } catch (error) {
    console.error("Error fetching timer settings:", error)
    throw error
  }
}

export async function startTimer(duration: number): Promise<boolean> {
  try {
    const endTime = new Date(Date.now() + duration * 1000).toISOString()

    // 既存のタイマー設定を取得
    const { data: existingTimer, error: fetchError } = await supabase
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Error fetching timer settings:", fetchError)
      return false
    }

    let result

    if (existingTimer && existingTimer.length > 0) {
      // 既存の設定を更新
      result = await supabase
        .from("timer_settings")
        .update({
          duration,
          end_time: endTime,
          is_running: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTimer[0].id)
    } else {
      // 新しい設定を作成
      result = await supabase.from("timer_settings").insert([
        {
          duration,
          end_time: endTime,
          is_running: true,
        },
      ])
    }

    if (result.error) {
      console.error("Error starting timer:", result.error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error starting timer:", error)
    return false
  }
}

export async function stopTimer(): Promise<boolean> {
  try {
    // 既存のタイマー設定を取得
    const { data: existingTimer, error: fetchError } = await supabase
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Error fetching timer settings:", fetchError)
      return false
    }

    if (!existingTimer || existingTimer.length === 0) {
      console.warn("No timer settings found to stop")
      return true // タイマーがない場合でも成功とみなす
    }

    // タイマーを停止
    const { error } = await supabase
      .from("timer_settings")
      .update({
        is_running: false,
        end_time: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTimer[0].id)

    if (error) {
      console.error("Error stopping timer:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error stopping timer:", error)
    return false
  }
}

export async function addPointsToTeam(teamId: number, points: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/teams/${teamId}/add-points`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.error || "ポイントの追加に失敗しました",
    }
  }

  return {
    success: true,
    message: result.message || "ポイントを更新しました",
  }
}

export async function getEventReport(): Promise<EventReport> {
  const response = await fetch("/api/reports/event-summary", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch event report")
  }

  return result.data
}

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
  qr_token?: string | null
  latitude: number
  longitude: number
  point_value: number
  is_checkpoint?: boolean
  is_moving?: boolean
  assigned_staff_id?: number | null
  assigned_staff_name?: string | null
  location_source?: "static" | "staff" | "static-fallback"
  base_latitude?: number
  base_longitude?: number
  last_location_update?: string | null
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

export interface EventReportCheckinHistoryItem {
  id: number
  timestamp: string
  checkpointId: number
  checkpointName: string
  pointValue: number
}

export interface EventReportLocationHistoryItem {
  id: number
  timestamp: string
  latitude: number
  longitude: number
  distanceFromPreviousMeters: number
}

export interface EventReportTimelineItem {
  id: string
  timestamp: string
  type: "checkin" | "location"
  title: string
  description: string
}

export interface EventReportTeamDetail {
  teamId: number
  teamName: string
  teamColor: string
  score: number
  totalCheckins: number
  totalLocationLogs: number
  estimatedDistanceMeters: number
  firstCheckinAt: string | null
  lastCheckinAt: string | null
  firstLocationAt: string | null
  lastLocationAt: string | null
  visitedCheckpointNames: string[]
  checkinHistory: EventReportCheckinHistoryItem[]
  locationHistory: EventReportLocationHistoryItem[]
  timeline: EventReportTimelineItem[]
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
  teamDetails: EventReportTeamDetail[]
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

export interface GameResetTargets {
  scores: boolean
  checkins: boolean
  teamLocations: boolean
  movingCheckpoints: boolean
  timer: boolean
}

export interface TeamMapSettings {
  team_location_auto_update_enabled: boolean
  team_location_update_interval_seconds: number
  team_map_auto_refresh_enabled: boolean
  team_map_refresh_interval_seconds: number
  team_scoreboard_visible: boolean
  updated_at?: string
}

export async function getCheckpoints(options?: { activeOnly?: boolean }): Promise<Checkpoint[]> {
  const searchParams = new URLSearchParams()
  if (options?.activeOnly) {
    searchParams.set("activeOnly", "true")
  }

  const response = await fetch(`/api/checkpoints${searchParams.size ? `?${searchParams.toString()}` : ""}`, { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch checkpoints")
  }

  return result.data || []
}

export async function getTeamLocations(): Promise<TeamLocation[]> {
  const { data, error } = await supabase.from("team_locations").select("*")
  if (error) {
    console.error("Error fetching team locations:", error)
    throw error
  }
  return data || []
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
): Promise<any> {
  try {
    const response = await fetch("/api/team-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teamId, latitude, longitude, deviceId }),
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
  const response = await fetch("/api/timer", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch timer settings")
  }

  return result.data || null
}

export async function startTimer(duration: number): Promise<boolean> {
  const response = await fetch("/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ duration }),
  })

  const result = await response.json()
  return response.ok && result.success === true
}

export async function stopTimer(): Promise<boolean> {
  const response = await fetch("/api/timer", {
    method: "DELETE",
  })

  const result = await response.json()
  return response.ok && result.success === true
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

export async function resetGameData(targets: GameResetTargets): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/reset-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targets }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.error || "ゲームデータのリセットに失敗しました",
    }
  }

  return {
    success: true,
    message: result.message || "ゲームデータをリセットしました",
  }
}

export async function getTeamMapSettings(): Promise<TeamMapSettings> {
  const response = await fetch("/api/team-map-settings", { cache: "no-store" })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch team map settings")
  }

  return result.data
}

export async function updateTeamMapSettings(
  settings: TeamMapSettings,
): Promise<{ success: boolean; message: string; data?: TeamMapSettings }> {
  const response = await fetch("/api/team-map-settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.error || "チーム向け地図設定の更新に失敗しました",
    }
  }

  return {
    success: true,
    message: result.message || "チーム向け地図設定を更新しました",
    data: result.data,
  }
}

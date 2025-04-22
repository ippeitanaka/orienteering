import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = () => {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

export interface Checkpoint {
  id: number
  created_at: string
  name: string
  description: string | null
  latitude: number
  longitude: number
  point_value: string | number // 文字列または数値として扱えるように修正
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
  team_id: number
  latitude: number
  longitude: number
  timestamp: string
}

export interface Staff {
  id: number
  created_at: string
  name: string
  password: string
  checkpoint_id: number | null
}

export interface TimerSettings {
  id?: number
  created_at?: string
  duration: number
  end_time: string | null
  is_running: boolean
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  try {
    // APIエンドポイントを使用してチェックポイントを取得
    const response = await fetch("/api/checkpoints", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error("Error fetching checkpoints:", error)

    // APIが失敗した場合、直接Supabaseから取得を試みる
    const { data, error: supabaseError } = await supabase.from("checkpoints").select("*")

    if (supabaseError) {
      console.error("Supabase error:", supabaseError)
      throw supabaseError
    }

    return data || []
  }
}

export async function getTeamLocations(): Promise<TeamLocation[]> {
  const { data, error } = await supabase.from("team_locations").select("*")

  if (error) {
    console.error("Error fetching team locations:", error)
    throw error
  }

  return data || []
}

export async function updateTeamLocation(teamId: number, latitude: number, longitude: number): Promise<void> {
  const { error } = await supabase.from("team_locations").insert([{ team_id: teamId, latitude, longitude }])

  if (error) {
    console.error("Error updating team location:", error)
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

export async function getTeamCheckins(teamId: number): Promise<any[]> {
  const { data, error } = await supabase.from("checkins").select("*").eq("team_id", teamId)

  if (error) {
    console.error("Error fetching team checkins:", error)
    throw error
  }

  return data || []
}

export async function getUncheckedTeams(checkpointId: number): Promise<Team[]> {
  const { data: allTeams, error: allTeamsError } = await supabase.from("teams").select("*")

  if (allTeamsError) {
    console.error("Error fetching all teams:", allTeamsError)
    return []
  }

  const { data: checkedInTeams, error: checkedInTeamsError } = await supabase
    .from("checkins")
    .select("team_id")
    .eq("checkpoint_id", checkpointId)

  if (checkedInTeamsError) {
    console.error("Error fetching checked-in teams:", checkedInTeamsError)
    return []
  }

  const checkedInTeamIds = checkedInTeams.map((checkin) => checkin.team_id)
  const uncheckedTeams = allTeams.filter((team) => !checkedInTeamIds.includes(team.id))

  return uncheckedTeams
}

export async function staffCheckInTeam(
  teamId: number,
  checkpointId: number,
  points: number,
): Promise<{ success: boolean; message: string }> {
  // チェックインが既に存在するか確認
  const { data: existingCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("team_id", teamId)
    .eq("checkpoint_id", checkpointId)
    .single()

  if (existingCheckin) {
    return { success: false, message: "このチームは既にチェックイン済みです" }
  }

  // チェックインを記録
  const { error: checkinError } = await supabase
    .from("checkins")
    .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

  if (checkinError) {
    console.error("Error creating checkin:", checkinError)
    return { success: false, message: "チェックインに失敗しました" }
  }

  // チームのスコアを更新
  const { data: team, error: teamError } = await supabase.from("teams").select("total_score").eq("id", teamId).single()

  if (teamError) {
    console.error("Error fetching team:", teamError)
    return { success: false, message: "チーム情報の取得に失敗しました" }
  }

  // 現在のスコアを確実に数値として扱う
  const currentScore =
    typeof team.total_score === "string" ? Number.parseInt(team.total_score, 10) : team.total_score || 0

  if (isNaN(currentScore)) {
    console.error("Invalid current score:", team.total_score)
  }

  const newScore = currentScore + points

  // スコアを更新
  const { error: updateError } = await supabase.from("teams").update({ total_score: newScore }).eq("id", teamId)

  if (updateError) {
    console.error("Error updating team score:", updateError)
    return { success: false, message: "スコア更新に失敗しました" }
  }

  return { success: true, message: `チェックインが完了しました！${points}ポイント獲得しました！` }
}

// チェックポイント関連の関数を修正
export async function createCheckpoint(
  checkpointData: any,
): Promise<{ success: boolean; message: string; data?: Checkpoint }> {
  const { name, description, latitude, longitude, point_value } = checkpointData

  // point_valueを文字列に変換して保存
  const { data, error } = await supabase
    .from("checkpoints")
    .insert([
      {
        name,
        description,
        latitude,
        longitude,
        point_value: point_value ? String(point_value) : "0",
      },
    ])
    .select()

  if (error) {
    console.error("Error creating checkpoint:", error)
    return { success: false, message: error.message }
  }

  return { success: true, message: "チェックポイントを作成しました", data: data[0] }
}

export async function updateCheckpoint(
  checkpointId: number,
  checkpointData: any,
): Promise<{ success: boolean; message: string; data?: Checkpoint }> {
  const { name, description, latitude, longitude, point_value } = checkpointData

  // point_valueを文字列に変換して更新
  const { data, error } = await supabase
    .from("checkpoints")
    .update({
      name,
      description,
      latitude,
      longitude,
      point_value: point_value ? String(point_value) : "0",
    })
    .eq("id", checkpointId)
    .select()

  if (error) {
    console.error("Error updating checkpoint:", error)
    return { success: false, message: error.message }
  }

  return { success: true, message: "チェックポイントを更新しました", data: data[0] }
}

export async function checkInTeam(
  teamId: number,
  checkpointId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    // チェックインが既に存在するか確認
    const { data: existingCheckin } = await supabase
      .from("checkins")
      .select("*")
      .eq("team_id", teamId)
      .eq("checkpoint_id", checkpointId)
      .single()

    if (existingCheckin) {
      return { success: false, message: "このチェックポイントは既にチェックイン済みです" }
    }

    // チェックポイントの情報を取得
    const { data: checkpoint } = await supabase
      .from("checkpoints")
      .select("point_value")
      .eq("id", checkpointId)
      .single()

    if (!checkpoint) {
      return { success: false, message: "チェックポイントが見つかりません" }
    }

    // チェックインを記録
    const { error: checkinError } = await supabase
      .from("checkins")
      .insert([{ team_id: teamId, checkpoint_id: checkpointId }])

    if (checkinError) {
      console.error("Error creating checkin:", checkinError)
      return { success: false, message: "チェックインに失敗しました" }
    }

    // ポイント値を数値に変換
    let pointValue = 0
    try {
      // point_valueが文字列か数値かに関わらず適切に処理
      pointValue =
        typeof checkpoint.point_value === "string"
          ? Number.parseInt(checkpoint.point_value, 10)
          : checkpoint.point_value || 0

      if (isNaN(pointValue)) {
        console.error("Invalid point value:", checkpoint.point_value)
        pointValue = 0
      }
    } catch (e) {
      console.error("Error parsing point value:", e)
      pointValue = 0
    }

    // チームのスコアを更新
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("total_score")
      .eq("id", teamId)
      .single()

    if (teamError) {
      console.error("Error fetching team:", teamError)
      return { success: false, message: "チーム情報の取得に失敗しました" }
    }

    // 現在のスコアを確実に数値として扱う
    const currentScore =
      typeof team.total_score === "string" ? Number.parseInt(team.total_score, 10) : team.total_score || 0

    if (isNaN(currentScore)) {
      console.error("Invalid current score:", team.total_score)
    }

    const newScore = currentScore + pointValue

    // スコアを更新
    const { error: updateError } = await supabase.from("teams").update({ total_score: newScore }).eq("id", teamId)

    if (updateError) {
      console.error("Error updating team score:", updateError)
      return { success: false, message: "スコア更新に失敗しました" }
    }

    return { success: true, message: `チェックインが完了しました！${pointValue}ポイント獲得しました！` }
  } catch (error) {
    console.error("Error in checkInTeam function:", error)
    return { success: false, message: "チェックイン処理中にエラーが発生しました" }
  }
}

export const generateQRCodeUrl = (checkpointId: string): string => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com"
  return `${appUrl}/checkpoint/${checkpointId}`
}

// 既存のファイルに追加
// タイマー関連の関数

export async function getTimerSettings(): Promise<TimerSettings | null> {
  try {
    const { data, error } = await supabase
      .from("timer_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error("Error fetching timer settings:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("Failed to fetch timer settings:", err)
    return null
  }
}

export async function updateTimerSettings(settings: Partial<TimerSettings>): Promise<boolean> {
  try {
    // 既存のタイマー設定を取得
    const { data: existingTimer } = await supabase
      .from("timer_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (existingTimer) {
      // 既存の設定を更新
      const { error } = await supabase.from("timer_settings").update(settings).eq("id", existingTimer.id)

      if (error) {
        console.error("Error updating timer settings:", error)
        return false
      }
      return true
    } else {
      // 新しい設定を作成
      const { error } = await supabase.from("timer_settings").insert([settings])
      if (error) {
        console.error("Error creating timer settings:", error)
        return false
      }
      return true
    }
  } catch (err) {
    console.error("Failed to update timer settings:", err)
    return false
  }
}

export async function startTimer(durationInSeconds: number): Promise<boolean> {
  try {
    const endTime = new Date(Date.now() + durationInSeconds * 1000).toISOString()

    return await updateTimerSettings({
      duration: durationInSeconds,
      end_time: endTime,
      is_running: true,
    })
  } catch (err) {
    console.error("Failed to start timer:", err)
    return false
  }
}

export async function stopTimer(): Promise<boolean> {
  try {
    return await updateTimerSettings({
      is_running: false,
      end_time: null,
    })
  } catch (err) {
    console.error("Failed to stop timer:", err)
    return false
  }
}

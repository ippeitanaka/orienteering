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

// タイマー情報の型定義
export interface Timer {
  id: number
  duration: number // 制限時間（秒）
  start_time: string | null // 開始時間
  end_time: string | null // 終了時間
  status: "not_started" | "running" | "finished" // ステータス
  created_at: string
  updated_at: string
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

export function generateQRCodeUrl(checkpointId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  return `${appUrl}/checkpoint/${checkpointId}`
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

// タイマー関連の関数
export async function getTimer(): Promise<Timer | null> {
  try {
    const { data, error } = await supabase.from("timer").select("*").eq("id", 1).single()

    if (error) {
      console.error("Error fetching timer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getTimer function:", error)
    return null
  }
}

export async function startTimer(durationMinutes: number): Promise<{ success: boolean; message: string }> {
  try {
    // まず、タイマーテーブルに初期レコードが存在するか確認
    const { data: existingTimer, error: checkError } = await supabase.from("timer").select("id").eq("id", 1).single()

    if (checkError) {
      // レコードが存在しない場合は作成
      if (checkError.code === "PGRST116") {
        const now = new Date()
        const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

        const { error: insertError } = await supabase.from("timer").insert([
          {
            id: 1,
            duration: durationMinutes * 60,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            status: "running",
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ])

        if (insertError) {
          console.error("Error inserting timer record:", insertError)
          return { success: false, message: "タイマーレコードの作成に失敗しました" }
        }

        return { success: true, message: `${durationMinutes}分のタイマーを開始しました` }
      } else {
        console.error("Error checking timer record:", checkError)
        return { success: false, message: "タイマー情報の確認に失敗しました" }
      }
    }

    // 既存のレコードを更新
    const now = new Date()
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

    const { error } = await supabase
      .from("timer")
      .update({
        duration: durationMinutes * 60, // 秒単位で保存
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        status: "running",
        updated_at: now.toISOString(),
      })
      .eq("id", 1)

    if (error) {
      console.error("Error starting timer:", error)
      return { success: false, message: "タイマーの開始に失敗しました: " + error.message }
    }

    return { success: true, message: `${durationMinutes}分のタイマーを開始しました` }
  } catch (error) {
    console.error("Error in startTimer function:", error)
    return {
      success: false,
      message: "タイマー開始処理中にエラーが発生しました: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function stopTimer(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from("timer")
      .update({
        status: "finished",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (error) {
      console.error("Error stopping timer:", error)
      return { success: false, message: "タイマーの停止に失敗しました: " + error.message }
    }

    return { success: true, message: "タイマーを停止しました" }
  } catch (error) {
    console.error("Error in stopTimer function:", error)
    return {
      success: false,
      message: "タイマー停止処理中にエラーが発生しました: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function resetTimer(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from("timer")
      .update({
        duration: 3600, // デフォルト1時間
        start_time: null,
        end_time: null,
        status: "not_started",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (error) {
      console.error("Error resetting timer:", error)
      return { success: false, message: "タイマーのリセットに失敗しました: " + error.message }
    }

    return { success: true, message: "タイマーをリセットしました" }
  } catch (error) {
    console.error("Error in resetTimer function:", error)
    return {
      success: false,
      message:
        "タイマーリセット処理中にエラーが発生しました: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

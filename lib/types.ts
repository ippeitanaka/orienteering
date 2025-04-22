// 既存の型定義に追加
export interface TimerSettings {
  id: number
  duration: number // 秒単位
  end_time: string | null // タイマーの終了時刻（ISO形式）
  is_running: boolean
  created_at: string
  updated_at: string
}

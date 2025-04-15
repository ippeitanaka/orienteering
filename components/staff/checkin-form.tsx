"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { getUncheckedTeams, staffCheckInTeam, type Team, type Checkpoint } from "@/lib/supabase"

interface CheckinFormProps {
  checkpoint: Checkpoint
  onSuccess?: () => void
}

export default function CheckinForm({ checkpoint, onSuccess }: CheckinFormProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [points, setPoints] = useState<number>(checkpoint.point_value)
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  useEffect(() => {
    async function fetchUncheckedTeams() {
      try {
        const teamsData = await getUncheckedTeams(checkpoint.id)
        setTeams(teamsData)
      } catch (err) {
        console.error("Failed to fetch unchecked teams:", err)
      } finally {
        setLoadingTeams(false)
      }
    }

    fetchUncheckedTeams()
  }, [checkpoint.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam) {
      setStatus({
        success: false,
        message: "チームを選択してください",
      })
      return
    }

    setLoading(true)
    setStatus(null)

    try {
      const result = await staffCheckInTeam(Number.parseInt(selectedTeam), checkpoint.id, points)
      setStatus(result)

      if (result.success) {
        setSelectedTeam("")
        setPoints(checkpoint.point_value)

        // 未チェックインのチーム一覧を更新
        const updatedTeams = await getUncheckedTeams(checkpoint.id)
        setTeams(updatedTeams)

        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (error) {
      console.error("Error checking in team:", error)
      setStatus({
        success: false,
        message: "チェックイン処理中にエラーが発生しました",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>チームチェックイン</CardTitle>
        <CardDescription>
          担当チェックポイント: <span className="font-bold">{checkpoint.name}</span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">チーム選択</Label>
            {loadingTeams ? (
              <div className="h-10 flex items-center justify-center bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">チーム情報を読み込み中...</span>
              </div>
            ) : teams.length === 0 ? (
              <div className="h-10 flex items-center justify-center bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">すべてのチームがチェックイン済みです</span>
              </div>
            ) : (
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="チームを選択" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">付与ポイント</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(Number.parseInt(e.target.value) || 0)}
              min="0"
              required
            />
          </div>

          {status && (
            <Alert variant={status.success ? "default" : "destructive"}>
              {status.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{status.success ? "成功" : "エラー"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading || loadingTeams || teams.length === 0}>
            {loading ? "処理中..." : "チェックイン完了"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

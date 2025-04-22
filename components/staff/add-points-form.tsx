"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, AlertCircle } from "lucide-react"
import type { Team } from "@/lib/supabase"

interface AddPointsFormProps {
  teams: Team[]
  onSuccess?: () => void
}

export default function AddPointsForm({ teams, onSuccess }: AddPointsFormProps) {
  const [teamId, setTeamId] = useState<string>("")
  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      const response = await fetch(`/api/teams/${teamId}/add-points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ points }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setStatus({
          success: false,
          message: result.error || "ポイントの追加に失敗しました",
        })
      } else {
        setStatus({
          success: true,
          message: result.message || "ポイントを追加しました",
        })

        // フォームをリセット
        setPoints(0)

        if (onSuccess) {
          // 少し遅延を入れて状態をリセット
          setTimeout(() => {
            onSuccess()
          }, 1000)
        }
      }
    } catch (error) {
      console.error("Error adding points:", error)
      setStatus({
        success: false,
        message: "ポイントの追加中にエラーが発生しました",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ポイント追加</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">チーム選択</Label>
            <Select value={teamId} onValueChange={setTeamId} required>
              <SelectTrigger id="team">
                <SelectValue placeholder="チームを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">追加ポイント</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(Number.parseInt(e.target.value) || 0)}
              required
            />
            <p className="text-xs text-muted-foreground">マイナス値を入力するとポイントを減らすことができます</p>
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
          <Button type="submit" disabled={loading || !teamId}>
            {loading ? "処理中..." : "ポイントを追加"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { getContrastColor } from "@/lib/utils"
import type { Team } from "@/lib/supabase"

interface TeamFormProps {
  team?: Team
  onSuccess?: (team: Team) => void
  onCancel?: () => void
}

export default function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const [name, setName] = useState(team?.name || "")
  const [color, setColor] = useState(team?.color || "#FF5252")
  const [teamCode, setTeamCode] = useState(team?.team_code || (team ? team.id.toString() : ""))
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const isEditing = !!team

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      let response

      if (isEditing && team) {
        // チーム更新APIを呼び出し
        response = await fetch(`/api/teams/${team.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, color, team_code: teamCode }),
        })
      } else {
        // チーム作成APIを呼び出し
        response = await fetch("/api/teams", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, color, team_code: teamCode }),
        })
      }

      const result = await response.json()

      if (!response.ok || !result.success) {
        setStatus({
          success: false,
          message: result.error || "チームの保存に失敗しました",
        })
      } else {
        setStatus({
          success: true,
          message: result.message || "チームを保存しました",
        })

        if (onSuccess && result.data) {
          // 少し遅延を入れて状態をリセット
          setTimeout(() => {
            onSuccess(result.data)
          }, 1000)
        }
      }
    } catch (error) {
      console.error("Error saving team:", error)
      setStatus({
        success: false,
        message: "チームの保存中にエラーが発生しました",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTeamCodeDisplay = () => {
    if (!isEditing || !team) return null

    return (
      <div className="space-y-2 mt-4 p-3 bg-muted rounded-lg">
        <Label className="font-medium">システムID（変更不可）</Label>
        <div className="flex items-center gap-2">
          <div className="bg-background p-2 rounded font-mono text-lg">{team.id}</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(team.id.toString())
              alert("システムIDをコピーしました")
            }}
          >
            コピー
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          これはシステム内部で使用されるIDです。チームコードとは異なります。
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "チームを編集" : "新しいチームを作成"}</CardTitle>
        <CardDescription>
          {isEditing ? "チームの情報を更新します" : "新しいチームの情報を入力してください"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">チーム名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: レッドチーム"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamCode">チームコード</Label>
            <Input
              id="teamCode"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="例: RED123"
              required
            />
            <p className="text-xs text-muted-foreground">
              チームメンバーがログインに使用するコードです。わかりやすい値を設定してください。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">チームカラー</Label>
            <div className="flex items-center gap-4">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#FF5252"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                title="有効なカラーコードを入力してください（例: #FF5252）"
              />
            </div>
          </div>

          <div className="p-4 rounded-md" style={{ backgroundColor: color }}>
            <p className="text-center font-bold" style={{ color: getContrastColor(color) }}>
              {name || "チーム名"}
            </p>
          </div>

          {getTeamCodeDisplay()}
          {status && (
            <Alert variant={status.success ? "default" : "destructive"}>
              {status.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{status.success ? "成功" : "エラー"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : isEditing ? "更新" : "作成"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

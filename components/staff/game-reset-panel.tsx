"use client"

import { useState } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { resetGameData, type GameResetTargets } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface GameResetPanelProps {
  onResetComplete?: () => Promise<void> | void
}

const RESET_TARGET_LABELS: Record<keyof GameResetTargets, { title: string; description: string }> = {
  scores: {
    title: "チーム得点",
    description: "teams.total_score を 0 に戻します。",
  },
  checkins: {
    title: "チェックイン履歴",
    description: "checkins を全削除します。",
  },
  teamLocations: {
    title: "チーム GPS 履歴",
    description: "team_locations と位置共有ロックを削除します。",
  },
  movingCheckpoints: {
    title: "移動チェックポイント位置",
    description: "staff_locations を削除し、移動チェックポイントを初期位置表示に戻します。",
  },
  timer: {
    title: "タイマー状態",
    description: "停止状態に戻し、終了時刻を解除します。",
  },
}

const DEFAULT_RESET_TARGETS: GameResetTargets = {
  scores: true,
  checkins: true,
  teamLocations: true,
  movingCheckpoints: true,
  timer: true,
}

export default function GameResetPanel({ onResetComplete }: GameResetPanelProps) {
  const { toast } = useToast()
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [targets, setTargets] = useState<GameResetTargets>(DEFAULT_RESET_TARGETS)

  const selectedTargetKeys = Object.entries(targets)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as keyof GameResetTargets)

  const selectedTargetLabels = selectedTargetKeys.map((key) => RESET_TARGET_LABELS[key].title)

  const toggleTarget = (key: keyof GameResetTargets, checked: boolean) => {
    setTargets((prev) => ({ ...prev, [key]: checked }))
  }

  const handleReset = async () => {
    try {
      setIsResetting(true)
      setError(null)
      setSuccess(null)

      if (selectedTargetKeys.length === 0) {
        throw new Error("リセット対象を1つ以上選択してください")
      }

      const result = await resetGameData(targets)

      if (!result.success) {
        throw new Error(result.message)
      }

      setSuccess(result.message)
      toast({
        title: "リセット完了",
        description: result.message,
      })
      setIsDialogOpen(false)

      if (onResetComplete) {
        await onResetComplete()
      }
    } catch (resetError) {
      console.error("Failed to reset game data:", resetError)
      const message = resetError instanceof Error ? resetError.message : "ゲームデータのリセット中にエラーが発生しました"
      setError(message)
      toast({
        title: "リセット失敗",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          ゲーム一括リセット
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          リセット対象を選んで、進行データだけを初期化できます。チームやチェックポイントの登録情報は残ります。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>元に戻せません</AlertTitle>
          <AlertDescription>
            チームとチェックポイントのマスターデータは残しますが、ゲーム進行データはすべて消去されます。再開前のイベントでのみ実行してください。
          </AlertDescription>
        </Alert>

        <div className="space-y-3 rounded-lg border p-3 sm:p-4">
          <div>
            <h3 className="text-sm font-semibold sm:text-base">リセット対象</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">必要な項目だけ選択できます。</p>
          </div>
          <div className="space-y-3">
            {Object.entries(RESET_TARGET_LABELS).map(([key, item]) => {
              const targetKey = key as keyof GameResetTargets

              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    checked={targets[targetKey]}
                    onCheckedChange={(checked) => toggleTarget(targetKey, checked === true)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium sm:text-base">{item.title}</span>
                    <span className="block text-xs text-muted-foreground sm:text-sm">{item.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>{selectedTargetKeys.length} 項目を選択中</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTargets(DEFAULT_RESET_TARGETS)}
              disabled={isResetting}
            >
              すべて選択
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setTargets({
                  scores: false,
                  checkins: false,
                  teamLocations: false,
                  movingCheckpoints: false,
                  timer: false,
                })
              }
              disabled={isResetting}
            >
              すべて解除
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>リセット失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertTitle>リセット完了</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="min-h-12 w-full sm:w-auto" disabled={isResetting || selectedTargetKeys.length === 0}>
              <RotateCcw className="mr-2 h-4 w-4" />
              選択した項目をリセット
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>選択したデータをリセットしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                次の項目を初期化します: {selectedTargetLabels.join("、")}。この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              {selectedTargetLabels.map((label) => (
                <p key={label}>• {label}</p>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  void handleReset()
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isResetting}
              >
                {isResetting ? "リセット中..." : "実行する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
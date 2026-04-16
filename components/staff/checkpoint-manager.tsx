"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, Edit, QrCode, Trash, Plus, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import CheckpointForm from "@/components/staff/checkpoint-form"
import CheckpointQrSheet from "@/components/staff/checkpoint-qr-sheet"
import { getCheckpoints, type Checkpoint, updateCheckpoint } from "@/lib/supabase"

export default function CheckpointManager() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [togglingCheckpointId, setTogglingCheckpointId] = useState<number | null>(null)

  useEffect(() => {
    fetchCheckpoints()
  }, [refreshTrigger])

  const fetchCheckpoints = async () => {
    try {
      setLoading(true)
      const checkpointsData = await getCheckpoints()
      console.log("Fetched checkpoints:", checkpointsData) // デバッグ用
      setCheckpoints(checkpointsData)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch checkpoints:", err)
      setError("チェックポイントの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCheckpoint = () => {
    setCurrentCheckpoint(null)
    setIsFormDialogOpen(true)
  }

  const handleEditCheckpoint = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsFormDialogOpen(true)
  }

  const handleDeleteCheckpoint = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsDeleteDialogOpen(true)
  }

  const handleShowQr = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsQrDialogOpen(true)
  }

  const confirmDeleteCheckpoint = async () => {
    if (!currentCheckpoint) return

    try {
      const response = await fetch(`/api/checkpoints/${currentCheckpoint.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "チェックポイントの削除に失敗しました")
      }

      setIsDeleteDialogOpen(false)
      setRefreshTrigger((prev) => prev + 1) // 再取得をトリガー
    } catch (err) {
      console.error("Failed to delete checkpoint:", err)
      setError(err instanceof Error ? err.message : "チェックポイントの削除中にエラーが発生しました")
    }
  }

  const handleFormSuccess = (checkpoint: Checkpoint) => {
    setIsFormDialogOpen(false)
    setRefreshTrigger((prev) => prev + 1) // 再取得をトリガー
  }

  const handleToggleCheckpoint = async (checkpoint: Checkpoint, checked: boolean) => {
    try {
      setTogglingCheckpointId(checkpoint.id)
      const result = await updateCheckpoint(checkpoint.id, { is_checkpoint: checked })

      if (!result.success) {
        throw new Error(result.message || "チェックポイント設定の更新に失敗しました")
      }

      setCheckpoints((prev) =>
        prev.map((item) => (item.id === checkpoint.id ? { ...item, is_checkpoint: checked } : item)),
      )
      setError(null)
    } catch (err) {
      console.error("Failed to toggle checkpoint state:", err)
      setError(err instanceof Error ? err.message : "チェックポイント設定の更新中にエラーが発生しました")
    } finally {
      setTogglingCheckpointId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>チェックポイント管理</CardTitle>
          <CardDescription>
            チーム画面で有効なチェックポイントは {checkpoints.filter((checkpoint) => checkpoint.is_checkpoint !== false).length} 件です
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" size="sm" className="min-h-11" onClick={() => setRefreshTrigger((prev) => prev + 1)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button size="sm" className="min-h-11" onClick={handleCreateCheckpoint}>
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-2">チェックポイント情報を読み込み中...</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="min-w-[980px]">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>チーム画面</TableHead>
                  <TableHead>担当スタッフ</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>ポイント</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      チェックポイントがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  checkpoints.map((checkpoint) => (
                    <TableRow key={checkpoint.id} className="min-w-[980px]">
                      <TableCell>{checkpoint.id}</TableCell>
                      <TableCell className="font-medium">{checkpoint.name}</TableCell>
                      <TableCell>
                        <Badge variant={checkpoint.is_moving ? "default" : "outline"}>
                          {checkpoint.is_moving ? "移動" : "固定"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={checkpoint.is_checkpoint !== false}
                            disabled={togglingCheckpointId === checkpoint.id}
                            onCheckedChange={(checked) => void handleToggleCheckpoint(checkpoint, checked)}
                          />
                          <span className="text-sm text-muted-foreground">{checkpoint.is_checkpoint !== false ? "ON" : "OFF"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{checkpoint.assigned_staff_name || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{checkpoint.description || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {checkpoint.latitude.toFixed(6)}, {checkpoint.longitude.toFixed(6)}
                        {checkpoint.location_source === "staff" ? (
                          <p className="mt-1 text-[10px] text-primary">スタッフ位置を反映中</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{checkpoint.point_value}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQr(checkpoint)}
                            title="QRコード"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCheckpoint(checkpoint)}
                            title="編集"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCheckpoint(checkpoint)}
                            title="削除"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* チェックポイント作成/編集ダイアログ */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{currentCheckpoint ? "チェックポイントを編集" : "新しいチェックポイントを作成"}</DialogTitle>
            </DialogHeader>
            <CheckpointForm
              checkpoint={currentCheckpoint || undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>QRポスター</DialogTitle>
            </DialogHeader>
            {currentCheckpoint ? <CheckpointQrSheet checkpoint={currentCheckpoint} /> : null}
          </DialogContent>
        </Dialog>

        {/* チェックポイント削除確認ダイアログ */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>チェックポイントを削除</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>チェックポイント「{currentCheckpoint?.name}」を削除してもよろしいですか？</p>
              <p className="text-sm text-muted-foreground mt-2">この操作は元に戻せません。</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCheckpoint}>
                削除
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, Edit, Trash, Plus, QrCode, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CheckpointForm from "@/components/staff/checkpoint-form"
import QRCodeDisplay from "@/components/staff/qr-code-display"
import { getCheckpoints, type Checkpoint } from "@/lib/supabase"

export default function CheckpointManager() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  const handleShowQR = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsQRDialogOpen(true)
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>チェックポイント管理</CardTitle>
          <CardDescription>チェックポイントの作成、編集、削除を行います</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((prev) => prev + 1)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button size="sm" onClick={handleCreateCheckpoint}>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>ポイント</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      チェックポイントがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  checkpoints.map((checkpoint) => (
                    <TableRow key={checkpoint.id}>
                      <TableCell>{checkpoint.id}</TableCell>
                      <TableCell className="font-medium">{checkpoint.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{checkpoint.description || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {checkpoint.latitude.toFixed(6)}, {checkpoint.longitude.toFixed(6)}
                      </TableCell>
                      <TableCell>{checkpoint.point_value}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQR(checkpoint)}
                            title="QRコードを表示"
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

        {/* QRコード表示ダイアログ */}
        <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>チェックポイントQRコード</DialogTitle>
            </DialogHeader>
            {currentCheckpoint && (
              <QRCodeDisplay checkpoint={currentCheckpoint} onClose={() => setIsQRDialogOpen(false)} />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

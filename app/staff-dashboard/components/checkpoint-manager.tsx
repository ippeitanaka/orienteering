"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AlertCircle, Edit, Trash, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Checkpoint {
  id: number
  name: string
  latitude: number
  longitude: number
  points: number
}

export default function CheckpointManager() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Partial<Checkpoint>>({})
  const [isEditing, setIsEditing] = useState(false)

  // チェックポイント一覧を取得
  const fetchCheckpoints = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/checkpoints")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "チェックポイントの取得に失敗しました")
      }

      setCheckpoints(data.checkpoints)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCheckpoints()
  }, [])

  // チェックポイントの作成/更新
  const handleSaveCheckpoint = async () => {
    try {
      if (
        !currentCheckpoint.name ||
        currentCheckpoint.latitude === undefined ||
        currentCheckpoint.longitude === undefined ||
        currentCheckpoint.points === undefined
      ) {
        setError("すべての項目を入力してください")
        return
      }

      const method = isEditing ? "PUT" : "POST"
      const url = isEditing ? `/api/checkpoints/${currentCheckpoint.id}` : "/api/checkpoints"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentCheckpoint),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "チェックポイントの保存に失敗しました")
      }

      setIsDialogOpen(false)
      fetchCheckpoints()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // チェックポイントの削除
  const handleDeleteCheckpoint = async () => {
    try {
      const response = await fetch(`/api/checkpoints/${currentCheckpoint.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "チェックポイントの削除に失敗しました")
      }

      setIsDeleteDialogOpen(false)
      fetchCheckpoints()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 新規チェックポイント作成ダイアログを開く
  const openNewCheckpointDialog = () => {
    setCurrentCheckpoint({})
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  // チェックポイント編集ダイアログを開く
  const openEditCheckpointDialog = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  // チェックポイント削除ダイアログを開く
  const openDeleteCheckpointDialog = (checkpoint: Checkpoint) => {
    setCurrentCheckpoint(checkpoint)
    setIsDeleteDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>チェックポイント管理</CardTitle>
        <Button onClick={openNewCheckpointDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>緯度</TableHead>
                <TableHead>経度</TableHead>
                <TableHead>ポイント</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    チェックポイントがありません
                  </TableCell>
                </TableRow>
              ) : (
                checkpoints.map((checkpoint) => (
                  <TableRow key={checkpoint.id}>
                    <TableCell>{checkpoint.id}</TableCell>
                    <TableCell>{checkpoint.name}</TableCell>
                    <TableCell>{checkpoint.latitude}</TableCell>
                    <TableCell>{checkpoint.longitude}</TableCell>
                    <TableCell>{checkpoint.points}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditCheckpointDialog(checkpoint)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteCheckpointDialog(checkpoint)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* チェックポイント作成/編集ダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "チェックポイントを編集" : "新規チェックポイント"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={currentCheckpoint.name || ""}
                  onChange={(e) => setCurrentCheckpoint({ ...currentCheckpoint, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">緯度</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={currentCheckpoint.latitude || ""}
                  onChange={(e) =>
                    setCurrentCheckpoint({ ...currentCheckpoint, latitude: Number.parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">経度</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={currentCheckpoint.longitude || ""}
                  onChange={(e) =>
                    setCurrentCheckpoint({ ...currentCheckpoint, longitude: Number.parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">ポイント</Label>
                <Input
                  id="points"
                  type="number"
                  value={currentCheckpoint.points || ""}
                  onChange={(e) =>
                    setCurrentCheckpoint({ ...currentCheckpoint, points: Number.parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveCheckpoint}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* チェックポイント削除確認ダイアログ */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>チェックポイントを削除</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>チェックポイント「{currentCheckpoint.name}」を削除してもよろしいですか？</p>
              <p className="text-sm text-muted-foreground mt-2">この操作は元に戻せません。</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDeleteCheckpoint}>
                削除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, Edit, Trash, Plus, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import TeamForm from "@/components/staff/team-form"
import { getTeams, type Team } from "@/lib/supabase"

export default function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetchTeams()
  }, [refreshTrigger])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const teamsData = await getTeams()
      setTeams(teamsData)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch teams:", err)
      setError("チームの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = () => {
    setCurrentTeam(null)
    setIsFormDialogOpen(true)
  }

  const handleEditTeam = (team: Team) => {
    setCurrentTeam(team)
    setIsFormDialogOpen(true)
  }

  const handleDeleteTeam = (team: Team) => {
    setCurrentTeam(team)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTeam = async () => {
    if (!currentTeam) return

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("チームの削除に失敗しました")
      }

      setIsDeleteDialogOpen(false)
      setRefreshTrigger((prev) => prev + 1) // 再取得をトリガー
    } catch (err) {
      console.error("Failed to delete team:", err)
      setError("チームの削除中にエラーが発生しました")
    }
  }

  const handleFormSuccess = () => {
    setIsFormDialogOpen(false)
    setRefreshTrigger((prev) => prev + 1) // 再取得をトリガー
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>チーム管理</CardTitle>
          <CardDescription>チームの作成、編集、削除を行います</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((prev) => prev + 1)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button size="sm" onClick={handleCreateTeam}>
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
            <p className="mt-2">チーム情報を読み込み中...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>チーム名</TableHead>
                  <TableHead>チームコード</TableHead>
                  <TableHead>カラー</TableHead>
                  <TableHead>スコア</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      チームがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>{team.id}</TableCell>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.team_code || team.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                          <span className="text-xs">{team.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>{team.total_score}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTeam(team)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team)}>
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

        {/* チーム作成/編集ダイアログ */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{currentTeam ? "チームを編集" : "新しいチームを作成"}</DialogTitle>
            </DialogHeader>
            <TeamForm
              team={currentTeam || undefined}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* チーム削除確認ダイアログ */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>チームを削除</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>チーム「{currentTeam?.name}」を削除してもよろしいですか？</p>
              <p className="text-sm text-muted-foreground mt-2">この操作は元に戻せません。</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={confirmDeleteTeam}>
                削除
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

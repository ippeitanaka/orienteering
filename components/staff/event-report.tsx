"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getEventReport, type EventReport } from "@/lib/supabase"
import { formatDate } from "@/lib/utils"
import { BarChart3, RefreshCw } from "lucide-react"

const eventStatusLabel: Record<string, string> = {
  running: "進行中",
  finished: "終了",
  not_started: "未開始",
}

export default function EventReport() {
  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const nextReport = await getEventReport()
      setReport(nextReport)
      setError(null)
    } catch (fetchError) {
      console.error("Failed to fetch event report:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "レポートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReport()
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            イベント自動レポート
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            チーム成績、到達数、移動チェックポイントの稼働状況をまとめて確認できます。
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchReport()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading && !report ? <div className="text-sm text-muted-foreground">レポートを集計中...</div> : null}

        {report ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">イベント状態</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge>{eventStatusLabel[report.summary.eventStatus]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(report.summary.generatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">総チェックイン数</p>
                  <p className="mt-2 text-2xl font-bold">{report.summary.totalCheckins}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">移動チェックポイント数</p>
                  <p className="mt-2 text-2xl font-bold">{report.summary.movingCheckpointCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">首位チーム</p>
                  <p className="mt-2 text-lg font-bold">{report.summary.topTeamName || "-"}</p>
                  <p className="text-xs text-muted-foreground">{report.summary.topScore}点</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">チーム別サマリー</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>順位</TableHead>
                        <TableHead>チーム</TableHead>
                        <TableHead>得点</TableHead>
                        <TableHead>到達数</TableHead>
                        <TableHead>最終到達</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.teams.map((team) => (
                        <TableRow key={team.teamId}>
                          <TableCell>{team.rank}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.teamColor }}></div>
                              <span>{team.teamName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{team.score}点</TableCell>
                          <TableCell>{team.checkins}</TableCell>
                          <TableCell>{team.lastCheckinAt ? formatDate(team.lastCheckinAt) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">チェックポイント別サマリー</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>チェックポイント</TableHead>
                        <TableHead>訪問数</TableHead>
                        <TableHead>到達チーム</TableHead>
                        <TableHead>種別</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.checkpoints.map((checkpoint) => (
                        <TableRow key={checkpoint.checkpointId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{checkpoint.checkpointName}</p>
                              <p className="text-xs text-muted-foreground">{checkpoint.pointValue}点</p>
                            </div>
                          </TableCell>
                          <TableCell>{checkpoint.visits}</TableCell>
                          <TableCell>{checkpoint.uniqueTeams}</TableCell>
                          <TableCell>
                            {checkpoint.isMoving ? (
                              <Badge>移動 / {checkpoint.assignedStaffName || "担当未設定"}</Badge>
                            ) : (
                              <Badge variant="outline">固定</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
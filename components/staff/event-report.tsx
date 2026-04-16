"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEventReport, type EventReport } from "@/lib/supabase"
import { formatDate, formatDistance } from "@/lib/utils"
import { Activity, BarChart3, MapPinned, RefreshCw, Route } from "lucide-react"

const eventStatusLabel: Record<string, string> = {
  running: "進行中",
  finished: "終了",
  not_started: "未開始",
}

export default function EventReport() {
  const [report, setReport] = useState<EventReport | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const nextReport = await getEventReport()
      setReport(nextReport)
      setSelectedTeamId((currentTeamId) => currentTeamId || nextReport.teamDetails[0]?.teamId.toString() || "")
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

  const selectedTeam = report?.teamDetails.find((team) => team.teamId.toString() === selectedTeamId) || report?.teamDetails[0]

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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader className="min-w-[680px]">
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
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader className="min-w-[640px]">
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

            <Card>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-base">チーム行動履歴</CardTitle>
                    <CardDescription>チェックインと GPS 記録を時系列で確認できます。</CardDescription>
                  </div>
                  <div className="w-full lg:w-[260px]">
                    <Select value={selectedTeam?.teamId.toString()} onValueChange={setSelectedTeamId}>
                      <SelectTrigger>
                        <SelectValue placeholder="チームを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {report.teamDetails.map((team) => (
                          <SelectItem key={team.teamId} value={team.teamId.toString()}>
                            {team.teamName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTeam ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">選択チーム</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedTeam.teamColor }}></div>
                            <p className="text-base font-bold">{selectedTeam.teamName}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">現在 {selectedTeam.score}点</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">チェックイン数</p>
                          <p className="mt-2 text-2xl font-bold">{selectedTeam.totalCheckins}</p>
                          <p className="text-xs text-muted-foreground">
                            初回 {selectedTeam.firstCheckinAt ? formatDate(selectedTeam.firstCheckinAt) : "-"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">GPS 記録数</p>
                          <p className="mt-2 text-2xl font-bold">{selectedTeam.totalLocationLogs}</p>
                          <p className="text-xs text-muted-foreground">
                            最新 {selectedTeam.lastLocationAt ? formatDate(selectedTeam.lastLocationAt) : "-"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">推定移動距離</p>
                          <p className="mt-2 text-2xl font-bold">{formatDistance(selectedTeam.estimatedDistanceMeters)}</p>
                          <p className="text-xs text-muted-foreground">GPS 記録から概算</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="rounded-lg border p-3 sm:p-4">
                      <p className="mb-2 text-sm font-medium">到達済みチェックポイント</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeam.visitedCheckpointNames.length > 0 ? (
                          selectedTeam.visitedCheckpointNames.map((name) => (
                            <Badge key={name} variant="secondary">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">まだ到達記録がありません。</p>
                        )}
                      </div>
                    </div>

                    <Tabs defaultValue="timeline" className="w-full">
                      <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-2 bg-muted/60 p-2">
                        <TabsTrigger value="timeline" className="min-h-11 min-w-[110px] px-3 py-3">
                          <Activity className="mr-2 h-4 w-4" />
                          タイムライン
                        </TabsTrigger>
                        <TabsTrigger value="checkins" className="min-h-11 min-w-[110px] px-3 py-3">
                          <Route className="mr-2 h-4 w-4" />
                          到達履歴
                        </TabsTrigger>
                        <TabsTrigger value="gps" className="min-h-11 min-w-[110px] px-3 py-3">
                          <MapPinned className="mr-2 h-4 w-4" />
                          GPS 履歴
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="timeline">
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader className="min-w-[720px]">
                              <TableRow>
                                <TableHead>時刻</TableHead>
                                <TableHead>種別</TableHead>
                                <TableHead>内容</TableHead>
                                <TableHead>詳細</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedTeam.timeline.length > 0 ? (
                                selectedTeam.timeline.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{formatDate(item.timestamp)}</TableCell>
                                    <TableCell>
                                      <Badge variant={item.type === "checkin" ? "default" : "outline"}>
                                        {item.type === "checkin" ? "到達" : "GPS"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.title}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                    行動履歴がまだありません。
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      <TabsContent value="checkins">
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader className="min-w-[640px]">
                              <TableRow>
                                <TableHead>時刻</TableHead>
                                <TableHead>チェックポイント</TableHead>
                                <TableHead>ポイント</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedTeam.checkinHistory.length > 0 ? (
                                selectedTeam.checkinHistory.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{formatDate(item.timestamp)}</TableCell>
                                    <TableCell className="font-medium">{item.checkpointName}</TableCell>
                                    <TableCell>{item.pointValue}点</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                                    到達履歴がまだありません。
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      <TabsContent value="gps">
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader className="min-w-[760px]">
                              <TableRow>
                                <TableHead>時刻</TableHead>
                                <TableHead>緯度</TableHead>
                                <TableHead>経度</TableHead>
                                <TableHead>前回からの移動</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedTeam.locationHistory.length > 0 ? (
                                selectedTeam.locationHistory.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{formatDate(item.timestamp)}</TableCell>
                                    <TableCell>{item.latitude.toFixed(6)}</TableCell>
                                    <TableCell>{item.longitude.toFixed(6)}</TableCell>
                                    <TableCell>{formatDistance(item.distanceFromPreviousMeters)}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                    GPS 履歴がまだありません。
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">表示できるチーム行動履歴がありません。</div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
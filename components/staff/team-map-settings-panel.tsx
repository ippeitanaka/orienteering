"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getTeamMapSettings, updateTeamMapSettings, type TeamMapSettings } from "@/lib/supabase"
import { MapPinned, RefreshCw } from "lucide-react"

const DEFAULT_SETTINGS: TeamMapSettings = {
  team_location_auto_update_enabled: true,
  team_location_update_interval_seconds: 180,
  team_map_auto_refresh_enabled: true,
  team_map_refresh_interval_seconds: 180,
}

export default function TeamMapSettingsPanel() {
  const [settings, setSettings] = useState<TeamMapSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const nextSettings = await getTeamMapSettings()
      setSettings(nextSettings)
      setError(null)
    } catch (fetchError) {
      console.error("Failed to fetch team map settings:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "設定の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const result = await updateTeamMapSettings(settings)

      if (!result.success) {
        throw new Error(result.message)
      }

      setSettings(result.data || settings)
      setSuccess("チーム向け地図設定を更新しました")
    } catch (saveError) {
      console.error("Failed to save team map settings:", saveError)
      setError(saveError instanceof Error ? saveError.message : "設定の保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MapPinned className="h-4 w-4 sm:h-5 sm:w-5" />
          チーム地図・位置情報設定
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          チーム画面ではこれらの設定 UI は非表示です。ここで自動更新の有効/無効と更新間隔を管理します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-3 sm:p-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="team-location-auto-update" className="font-medium">
                  チーム位置情報の定期送信
                </Label>
                <p className="text-xs text-muted-foreground">チーム端末から一定間隔で位置情報を送信します。</p>
              </div>
              <Switch
                id="team-location-auto-update"
                checked={settings.team_location_auto_update_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, team_location_auto_update_enabled: checked }))
                }
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-location-update-interval">送信間隔（秒）</Label>
              <Input
                id="team-location-update-interval"
                type="number"
                min="30"
                max="600"
                value={settings.team_location_update_interval_seconds}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    team_location_update_interval_seconds: Number(event.target.value),
                  }))
                }
                disabled={loading || saving}
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="team-map-auto-refresh" className="font-medium">
                  チーム地図の自動再読込
                </Label>
                <p className="text-xs text-muted-foreground">チェックポイントと他チーム位置の定期再取得を行います。</p>
              </div>
              <Switch
                id="team-map-auto-refresh"
                checked={settings.team_map_auto_refresh_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, team_map_auto_refresh_enabled: checked }))
                }
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-map-refresh-interval">再読込間隔（秒）</Label>
              <Input
                id="team-map-refresh-interval"
                type="number"
                min="30"
                max="600"
                value={settings.team_map_refresh_interval_seconds}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    team_map_refresh_interval_seconds: Number(event.target.value),
                  }))
                }
                disabled={loading || saving}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void fetchSettings()} disabled={loading || saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            再読込
          </Button>
          <Button onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
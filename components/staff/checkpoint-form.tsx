"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { createCheckpoint, updateCheckpoint, type Checkpoint } from "@/lib/supabase"

interface CheckpointFormProps {
  checkpoint?: Checkpoint
  onSuccess?: (checkpoint: Checkpoint) => void
  onCancel?: () => void
}

export default function CheckpointForm({ checkpoint, onSuccess, onCancel }: CheckpointFormProps) {
  const [name, setName] = useState(checkpoint?.name || "")
  const [description, setDescription] = useState(checkpoint?.description || "")
  const [latitude, setLatitude] = useState(checkpoint?.latitude?.toString() || "")
  const [longitude, setLongitude] = useState(checkpoint?.longitude?.toString() || "")
  const [pointValue, setPointValue] = useState(checkpoint?.point_value?.toString() || "10")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const isEditing = !!checkpoint

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    const checkpointData = {
      name,
      description,
      latitude: Number.parseFloat(latitude),
      longitude: Number.parseFloat(longitude),
      point_value: Number.parseInt(pointValue),
    }

    try {
      let result
      if (isEditing && checkpoint) {
        result = await updateCheckpoint(checkpoint.id, checkpointData)
      } else {
        result = await createCheckpoint(checkpointData)
      }

      setStatus(result)

      if (result.success && onSuccess && result.data) {
        onSuccess(result.data as Checkpoint)
      }
    } catch (error) {
      console.error("Error saving checkpoint:", error)
      setStatus({
        success: false,
        message: "チェックポイントの保存中にエラーが発生しました",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString())
          setLongitude(position.coords.longitude.toString())
        },
        (error) => {
          console.error("Error getting location:", error)
          setStatus({
            success: false,
            message: "現在位置の取得に失敗しました",
          })
        },
      )
    } else {
      setStatus({
        success: false,
        message: "お使いのブラウザは位置情報をサポートしていません",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "チェックポイントを編集" : "新しいチェックポイントを作成"}</CardTitle>
        <CardDescription>
          {isEditing ? "チェックポイントの情報を更新します" : "新しいチェックポイントの情報を入力してください"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">チェックポイント名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: スタート地点"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: オリエンテーションの開始地点です"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">緯度</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="例: 35.6895"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">経度</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="例: 139.6917"
                required
              />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={handleGetCurrentLocation} className="w-full">
            現在位置を取得
          </Button>

          <div className="space-y-2">
            <Label htmlFor="pointValue">ポイント値</Label>
            <Input
              id="pointValue"
              type="number"
              value={pointValue}
              onChange={(e) => setPointValue(e.target.value)}
              min="0"
              required
            />
          </div>

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

"use client"

import dynamic from "next/dynamic"

const RealtimeMonitor = dynamic(() => import("@/components/staff/realtime-monitor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[480px] items-center justify-center rounded-3xl border bg-card">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">リアルタイム画面を読み込み中...</p>
      </div>
    </div>
  ),
})

export default function RealtimeTab() {
  return <RealtimeMonitor />
}
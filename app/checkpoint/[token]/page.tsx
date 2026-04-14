import Image from "next/image"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import CheckpointCheckinPanel from "@/components/checkpoint/checkpoint-checkin-panel"
import { supabaseServer } from "@/lib/supabase-server"

const normalizePointValue = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

async function getCheckpointByToken(token: string) {
  if (!supabaseServer) {
    return null
  }

  let checkpointData: any = null

  const qrResult = await supabaseServer.from("checkpoints").select("*").eq("qr_token", token).limit(1).maybeSingle()

  if (qrResult.error) {
    const qrColumnMissing =
      qrResult.error.code === "42703" ||
      qrResult.error.code === "PGRST204" ||
      (typeof qrResult.error.message === "string" && qrResult.error.message.toLowerCase().includes("qr_token"))

    if (!qrColumnMissing) {
      throw qrResult.error
    }
  } else {
    checkpointData = qrResult.data
  }

  if (!checkpointData && /^\d+$/.test(token)) {
    const idResult = await supabaseServer.from("checkpoints").select("*").eq("id", Number.parseInt(token, 10)).limit(1).maybeSingle()
    if (idResult.error) {
      throw idResult.error
    }
    checkpointData = idResult.data
  }

  return checkpointData
}

async function getTeamSessionForCheckpoint(checkpointId: number) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("team_session")

  if (!sessionCookie?.value || !supabaseServer) {
    return { team: null, alreadyCheckedIn: false }
  }

  let session: { team_id?: number } | null = null
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    return { team: null, alreadyCheckedIn: false }
  }

  if (!session?.team_id) {
    return { team: null, alreadyCheckedIn: false }
  }

  const [{ data: team }, { data: checkin }] = await Promise.all([
    supabaseServer.from("teams").select("id, name, total_score").eq("id", session.team_id).maybeSingle(),
    supabaseServer
      .from("checkins")
      .select("id")
      .eq("team_id", session.team_id)
      .eq("checkpoint_id", checkpointId)
      .maybeSingle(),
  ])

  return {
    team: team
      ? {
          id: team.id,
          name: team.name,
          totalScore: team.total_score,
        }
      : null,
    alreadyCheckedIn: !!checkin,
  }
}

export default async function CheckpointQrLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const checkpoint = await getCheckpointByToken(token)

  if (!checkpoint) {
    notFound()
  }

  const { team, alreadyCheckedIn } = await getTeamSessionForCheckpoint(checkpoint.id)
  const pointValue = normalizePointValue(checkpoint.point_value)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#171717_0%,#2b2111_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-white/90 p-3 shadow-lg">
            <Image src="/images/elt-logo.png" alt="ELTロゴ" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-amber-200/80">Checkpoint Access</p>
            <h1 className="text-3xl font-bold">学外オリエンテーション</h1>
          </div>
        </div>

        <Card className="border-white/10 bg-white/95 text-zinc-900 shadow-2xl">
          <CardHeader>
            <CardDescription>チェックポイント情報</CardDescription>
            <CardTitle className="text-4xl font-bold">{checkpoint.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">ポイント</p>
                <p className="mt-2 text-3xl font-bold">{pointValue} pt</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">チェックポイントID</p>
                <p className="mt-2 text-3xl font-bold">#{checkpoint.id}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-sm font-semibold text-zinc-500">説明</p>
              <p className="mt-3 text-lg leading-8 text-zinc-800">
                {checkpoint.description || "このQRコードはチェックポイントを識別するために発行されています。スタッフの案内に従って進行してください。"}
              </p>
            </div>

            <div className="rounded-3xl bg-zinc-900 p-6 text-zinc-50">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Next Step</p>
              <p className="mt-3 text-lg leading-8">
                ログイン済みのチームは、このページからそのままチェックインできます。各チームが同じチェックポイントでポイントを受け取れるのは 1 回だけです。
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <CheckpointCheckinPanel
            token={token}
            checkpointId={checkpoint.id}
            checkpointName={checkpoint.name}
            pointValue={pointValue}
            team={team}
            alreadyCheckedIn={alreadyCheckedIn}
          />
        </div>
      </div>
    </main>
  )
}
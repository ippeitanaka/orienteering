import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function MapsApiHelpPage() {
  return (
    <div className="min-h-screen cute-bg">
      <header className="bg-primary/90 text-primary-foreground py-4 shadow-md">
        <div className="container mx-auto px-4 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ホームに戻る
            </Button>
          </Link>
          <h1 className="text-2xl font-bold font-heading ml-4">マップ機能について</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="cute-card border-primary/30 overflow-hidden max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
          <CardHeader>
            <CardTitle className="font-heading text-primary text-2xl">OpenStreetMapについて</CardTitle>
            <CardDescription>オリエンテーリングで使用しているマップ機能の説明</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="default" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>オープンソースの地図データ</AlertTitle>
              <AlertDescription>
                このアプリケーションでは、OpenStreetMapという無料でオープンソースの地図データを使用しています。
                世界中のボランティアによって作成・更新されている地図データです。
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h2 className="text-xl font-heading">マップの使い方</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>マップ上でドラッグすることで、表示エリアを移動できます。</li>
                <li>ピンチイン・ピンチアウト（またはダブルタップ）で拡大・縮小できます。</li>
                <li>「現在地を表示」ボタンをクリックすると、あなたの現在位置にマップが移動します。</li>
                <li>チェックポイントや他のチームの位置がマップ上にマーカーで表示されます。</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-heading">位置情報の許可について</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>マップ機能を使用するには、ブラウザの位置情報へのアクセスを許可する必要があります。</li>
                <li>位置情報の許可を求めるダイアログが表示されたら「許可」を選択してください。</li>
                <li>すでに拒否してしまった場合は、ブラウザの設定から再度許可する必要があります。</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-heading">マップが表示されない場合</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>インターネット接続を確認してください。</li>
                <li>ブラウザを最新バージョンに更新してみてください。</li>
                <li>ページを再読み込みしてみてください。</li>
                <li>ブラウザのキャッシュをクリアしてみてください。</li>
              </ol>
            </div>

            <Alert className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>データ通信量について</AlertTitle>
              <AlertDescription>
                マップの表示にはデータ通信が発生します。Wi-Fi環境での使用をお勧めします。
                モバイルデータ通信を使用する場合は、データ使用量にご注意ください。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-muted py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
        </div>
      </footer>
    </div>
  )
}

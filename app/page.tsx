import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">ELT学外オリエンテーション</h1>
          <p className="text-gray-600 dark:text-gray-300">東洋医療専門学校　救急救命士学科</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-4">チームの方</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                チームコードを使ってログインし、オリエンテーリングに参加しましょう。
              </p>
              <div className="flex justify-center">
                <Link href="/team-login">
                  <Button size="lg" className="w-full">
                    チームログイン
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-4">スタッフの方</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                スタッフ名とパスワードでログインし、イベントを管理しましょう。
              </p>
              <div className="flex justify-center">
                <Link href="/staff-login">
                  <Button size="lg" variant="outline" className="w-full">
                    スタッフログイン
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-4">スコアボード</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                各チームの現在のスコアとランキングを確認できます。
              </p>
              <div className="flex justify-center">
                <Link href="/scoreboard">
                  <Button size="lg" variant="secondary" className="w-full">
                    スコアボードを見る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">参加方法</h2>
          <ol className="list-decimal pl-6 space-y-2 mb-8">
            <li>チームリーダーはスタッフからチームコードを受け取ります</li>
            <li>チームログインページでチームコードを入力してログインします</li>
            <li>地図上のチェックポイントを探して、QRコードをスキャンします</li>
            <li>すべてのチェックポイントを回ってポイントを獲得しましょう</li>
            <li>スコアボードで他のチームとの競争を楽しみましょう</li>
          </ol>
        </div>

        <footer className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2025 東洋医療専門学校　救急救命士学科</p>
          <p className="mt-1">ELT学外オリエンテーション</p>
        </footer>
      </div>
    </div>
  )
}

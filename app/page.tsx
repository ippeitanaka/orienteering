import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen elt-bg">
      <div className="elt-container">
        <header className="text-center mb-8 py-4 sm:mb-12 sm:py-8">
          <div className="flex justify-center mb-4 sm:mb-6">
            <Image
              src="/images/elt-logo.png"
              alt="ELT 26周年記念ロゴ"
              width={160}
              height={96}
              className="elt-logo h-auto w-auto max-h-20 sm:max-h-24"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">学外オリエンテーション</h1>
          <p className="text-muted-foreground text-sm sm:text-base">東洋医療専門学校　救急救命士学科</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto mb-8 sm:mb-12">
          <Card className="elt-card">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-3 sm:mb-4">チームの方</h2>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-center text-sm sm:text-base">
                チームコードを使ってログインし、オリエンテーリングに参加しましょう。
              </p>
              <div className="flex justify-center">
                <Link href="/team-login">
                  <Button size="sm" className="elt-button w-full sm:size-lg">
                    チームログイン
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="elt-card">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-3 sm:mb-4">スタッフの方</h2>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-center text-sm sm:text-base">
                スタッフ名とパスワードでログインし、イベントを管理しましょう。
              </p>
              <div className="flex justify-center">
                <Link href="/staff-login">
                  <Button size="sm" variant="outline" className="w-full sm:size-lg">
                    スタッフログイン
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <Card className="elt-card">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-center mb-3 sm:mb-4">スコアボード</h2>
              <p className="text-muted-foreground mb-4 sm:mb-6 text-center text-sm sm:text-base">
                各チームの現在のスコアとランキングを確認できます。
              </p>
              <div className="flex justify-center">
                <Link href="/scoreboard">
                  <Button size="sm" variant="secondary" className="w-full sm:size-lg">
                    スコアボードを見る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto bg-card p-4 sm:p-6 rounded-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">参加方法</h2>
          <ol className="list-decimal pl-5 sm:pl-6 space-y-1.5 sm:space-y-2 mb-6 sm:mb-8 text-muted-foreground text-sm sm:text-base">
            <li>チームリーダーはスタッフからチームコードを受け取ります</li>
            <li>チームログインページでチームコードを入力してログインします</li>
            <li>地図上のチェックポイントを探して、QRコードをスキャンします</li>
            <li>すべてのチェックポイントを回ってポイントを獲得しましょう</li>
            <li>スコアボードで他のチームとの競争を楽しみましょう</li>
          </ol>
        </div>

        <footer className="elt-footer text-center mt-8">
          <p className="text-xs sm:text-sm">© {new Date().getFullYear()} 東洋医療専門学校　救急救命士学科</p>
          <p className="mt-1 text-xs sm:text-sm">ELT学外オリエンテーション</p>
        </footer>
      </div>
    </div>
  )
}

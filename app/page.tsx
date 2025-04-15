import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, Award, ArrowRight, Compass, Flag, Map } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen cute-bg">
      <header className="bg-primary/90 text-primary-foreground py-8 shadow-md relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-center tracking-tight">ELT学外オリエンテーション</h1>
          <p className="text-center mt-3 text-lg opacity-90">みんなで楽しくオリエンテーリング！</p>
          <div className="absolute -bottom-10 left-0 right-0 h-20 bg-gradient-to-t from-transparent to-primary/90 opacity-30"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
          <div className="absolute top-5 left-10 animate-float">
            <Compass className="w-20 h-20" />
          </div>
          <div className="absolute top-20 right-10 animate-bounce-slow">
            <Flag className="w-16 h-16" />
          </div>
          <div className="absolute bottom-10 left-1/4 animate-pulse-soft">
            <MapPin className="w-14 h-14" />
          </div>
          <div className="absolute bottom-20 right-1/4 animate-float" style={{ animationDelay: "1s" }}>
            <Map className="w-16 h-16" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="cute-card mb-12 border-primary/30 overflow-hidden slide-in">
            <div className="bg-gradient-to-r from-primary/20 to-secondary/30 p-1"></div>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl text-primary">ようこそ！</CardTitle>
              <CardDescription className="text-lg mt-2">このアプリでオリエンテーリングに参加しましょう</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-lg">
                チームを選んで、チェックポイントを探しながら楽しく学外を探検しましょう！
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <FeatureCard
                  icon={<MapPin className="h-10 w-10 text-primary" />}
                  title="チェックポイント"
                  description="キャンパス内の様々な場所にあるチェックポイントを見つけよう"
                  delay="delay-100"
                />
                <FeatureCard
                  icon={<Users className="h-10 w-10 text-primary" />}
                  title="チーム対抗"
                  description="チームで協力して、より多くのポイントを獲得しよう"
                  delay="delay-200"
                />
                <FeatureCard
                  icon={<Award className="h-10 w-10 text-primary" />}
                  title="ランキング"
                  description="リアルタイムでスコアを確認して、順位を競おう"
                  delay="delay-300"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pb-8">
              <Link href="/dashboard">
                <Button className="cute-button px-8 py-6 text-lg group shadow-lg hover:shadow-glow">
                  参加する
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <div className="text-center mt-10 slide-in delay-300">
            <Link href="/staff-login">
              <Button variant="outline" className="rounded-lg border-primary/30 hover:bg-primary/10 px-6 py-5">
                スタッフログイン
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-muted py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">© {new Date().getFullYear()} ELT学外オリエンテーション</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  delay = "",
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay?: string
}) {
  return (
    <div className={`glass-panel p-6 flex flex-col items-center text-center animate-float slide-in ${delay}`}>
      <div className="mb-4 bg-primary/10 p-4 rounded-full">{icon}</div>
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

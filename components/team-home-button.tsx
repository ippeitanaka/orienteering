import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TeamHomeButtonProps {
  className?: string
  label?: string
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link"
}

export default function TeamHomeButton({
  className,
  label = "ゲームホーム",
  variant = "outline",
}: TeamHomeButtonProps) {
  return (
    <Link href="/dashboard">
      <Button variant={variant} size="sm" className={className}>
        <Home className="h-4 w-4" />
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  )
}
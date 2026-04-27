"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
  className?: string
  variant?: "default" | "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
}

export default function ThemeToggle({
  className,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = (mounted ? resolvedTheme : "dark") === "dark"

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "ライトモードへ切り替え" : "ダークモードへ切り替え"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel ? <span>{isDark ? "ライトモード" : "ダークモード"}</span> : null}
    </Button>
  )
}
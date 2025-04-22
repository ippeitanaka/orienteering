import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // 基本フォント設定を変更
        sans: ["var(--font-nunito)", "var(--font-noto)", "sans-serif"],
        // かわいいフォントをデフォルトに
        cute: ["var(--font-bubblegum)", "var(--font-baloo)", "var(--font-noto)", "sans-serif"],
        // 見出し用フォント
        heading: ["var(--font-fredoka)", "var(--font-baloo)", "var(--font-noto)", "sans-serif"],
        // コミカルなフォント
        comic: ["var(--font-comic)", "var(--font-noto)", "sans-serif"],
        // 丸っこいフォント
        round: ["var(--font-fredoka)", "var(--font-noto)", "sans-serif"],
        // バブルガムフォント
        bubble: ["var(--font-bubblegum)", "var(--font-noto)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // カスタムカラー
        pink: {
          light: "#FFD6E0",
          DEFAULT: "#FF8FAB",
          dark: "#FF5C8A",
        },
        mint: {
          light: "#C9FFE2",
          DEFAULT: "#96F7D2",
          dark: "#5AEDB5",
        },
        lavender: {
          light: "#E2D6FF",
          DEFAULT: "#C8B6FF",
          dark: "#A48AFF",
        },
        lemon: {
          light: "#FFF8D6",
          DEFAULT: "#FFF0A5",
          dark: "#FFE566",
        },
        peach: {
          light: "#FFE8D6",
          DEFAULT: "#FFD0A9",
          dark: "#FFBA7A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "bounce-slow": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-5px)",
          },
        },
        "pulse-soft": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.8",
          },
        },
        "spin-slow": {
          "0%": {
            transform: "rotate(0deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
        pop: {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0.8",
          },
          "50%": {
            transform: "scale(1.05)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        ripple: {
          "0%": {
            transform: "scale(0)",
            opacity: "0.8",
          },
          "100%": {
            transform: "scale(2)",
            opacity: "0",
          },
        },
        "slide-up": {
          "0%": {
            transform: "translateY(20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "slide-in-right": {
          "0%": {
            transform: "translateX(20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateX(0)",
            opacity: "1",
          },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "80%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-rotate": {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(5deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-slow": "bounce-slow 3s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        pop: "pop 0.3s ease-out",
        ripple: "ripple 1.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        wiggle: "wiggle 1s ease-in-out infinite",
        "bounce-in": "bounce-in 0.5s ease-out",
        "float-rotate": "float-rotate 5s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 10px rgba(59, 130, 246, 0.5)",
        "glow-green": "0 0 10px rgba(16, 185, 129, 0.5)",
        "glow-orange": "0 0 10px rgba(249, 115, 22, 0.5)",
        "glow-pink": "0 0 15px rgba(255, 143, 171, 0.6)",
        "glow-mint": "0 0 15px rgba(150, 247, 210, 0.6)",
        "glow-lavender": "0 0 15px rgba(200, 182, 255, 0.6)",
        "glow-lemon": "0 0 15px rgba(255, 240, 165, 0.6)",
        "glow-peach": "0 0 15px rgba(255, 208, 169, 0.6)",
        "cute-sm": "0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)",
        "cute-md": "0 5px 15px rgba(0, 0, 0, 0.1), 0 3px 5px rgba(0, 0, 0, 0.05)",
        "cute-lg": "0 10px 25px rgba(0, 0, 0, 0.1), 0 5px 10px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

import { createClient } from "@supabase/supabase-js"

// 環境変数が存在するか確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// デバッグ情報
console.log("Server: NEXT_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl)
console.log("Server: SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseServiceKey)

// Supabaseサーバークライアントを作成
let supabaseServer = null

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    console.log("Supabase server client initialized successfully")
  } else {
    console.warn(
      "Supabase URL or Service Role Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment variables.",
    )
  }
} catch (error) {
  console.error("Failed to initialize Supabase server client:", error)
}

export { supabaseServer }

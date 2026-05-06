import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-project-url') {
    console.warn("Supabase keys not found or invalid in .env.local")
    return createBrowserClient("", "") // This will still fail if used, but avoids crash on init
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

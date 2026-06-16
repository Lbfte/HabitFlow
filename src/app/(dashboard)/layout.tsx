"use client"

import { Sidebar } from "@/components/Sidebar"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUserAndPrefs = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const uid = session.user?.id ?? null
      setUserId(uid)

      // Carrega a preferência de minimização
      const key = uid ? `hf:${uid}:sidebar_minimized` : `hf:anon:sidebar_minimized`
      const savedMinimized = localStorage.getItem(key)
      if (savedMinimized) {
        setIsSidebarMinimized(savedMinimized === "true")
      }
      
      setLoading(false)
    }
    checkUserAndPrefs()
  }, [])

  const toggleSidebarMinimize = () => {
    const next = !isSidebarMinimized
    setIsSidebarMinimized(next)
    const key = userId ? `hf:${userId}:sidebar_minimized` : `hf:anon:sidebar_minimized`
    localStorage.setItem(key, String(next))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar isMinimized={isSidebarMinimized} onToggleMinimize={toggleSidebarMinimize} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className={cn(
          "mx-auto p-4 md:p-8 transition-all duration-300 ease-in-out",
          isSidebarMinimized ? "max-w-6xl" : "max-w-5xl"
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut,
  Flame
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Flame, label: "Micro-Hábitos", href: "/habits" },
  { icon: CheckSquare, label: "Tarefas", href: "/tasks" },
  { icon: FileText, label: "Relatórios", href: "/reports" },
  { icon: Calendar, label: "Calendário", href: "/calendar" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-surface h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo">
            <div className="bg-indigo p-1.5 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span>HabitFlow</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo/10 text-indigo" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:bg-gray-50 hover:text-foreground",
              pathname === "/settings" && "bg-gray-50 text-foreground"
            )}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-2 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                isActive ? "text-indigo" : "text-gray-400"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-indigo/10")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split('-')[0]}</span>
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 p-2 text-gray-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Sair</span>
        </button>
      </nav>
    </>
  )
}

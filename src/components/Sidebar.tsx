import { useState, useEffect } from "react"
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
  Flame,
  Sun,
  Moon,
  Palette,
  MoreHorizontal,
  X,
  Timer,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useTheme } from "@/components/ThemeProvider"
import { Logo } from "@/components/Logo"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Flame, label: "Micro-Hábitos", href: "/habits" },
  { icon: CheckSquare, label: "Tarefas", href: "/tasks" },
  { icon: Palette, label: "Quadros Visuais", href: "/whiteboards" },
  { icon: FileText, label: "Relatórios", href: "/reports" },
  { icon: Calendar, label: "Calendário", href: "/calendar" },
  { icon: Timer, label: "Foco", href: "/focus" },
]

interface SidebarProps {
  isMinimized: boolean
  onToggleMinimize: () => void
}

export function Sidebar({ isMinimized, onToggleMinimize }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      const pathParts = window.location.pathname.split('/')
      const basePath = window.location.hostname.includes('github.io') && pathParts[1] ? `/${pathParts[1]}` : ''
      window.location.href = `${basePath}/login/`
    } catch (error) {
      console.error("Erro ao sair:", error)
    }
  }

  // Links principais mostrados diretamente na barra inferior no mobile
  const mainMobileItems = [
    { icon: LayoutDashboard, label: "Hoje", href: "/dashboard" },
    { icon: Flame, label: "Hábitos", href: "/habits" },
    { icon: CheckSquare, label: "Tarefas", href: "/tasks" },
    { icon: Palette, label: "Quadros", href: "/whiteboards" },
  ]

  // Links secundários mostrados na gaveta "Mais" no mobile
  const moreMobileItems = [
    { icon: Timer, label: "Foco", href: "/focus" },
    { icon: FileText, label: "Relatórios", href: "/reports" },
    { icon: Calendar, label: "Calendário", href: "/calendar" },
  ]

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-surface h-screen sticky top-0 transition-all duration-300 ease-in-out",
          isMinimized ? "w-20" : "w-64"
        )}
      >
        <div className={cn("p-6 flex items-center justify-between", isMinimized && "flex-col gap-4 px-2")}>
          <div className={cn("flex items-center gap-2 font-bold text-xl text-indigo", isMinimized && "justify-center")}>
            <div className="bg-indigo/10 p-1.5 rounded-xl shrink-0">
              <Logo className="w-8 h-8 text-indigo" />
            </div>
            {!isMinimized && <span className="animate-in fade-in duration-200">Synca</span>}
          </div>

          <button
            onClick={onToggleMinimize}
            className={cn(
              "p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-muted/10 transition-all shrink-0 border border-transparent hover:border-border",
              isMinimized && "mt-2"
            )}
            title={isMinimized ? "Expandir Menu" : "Recolher Menu"}
          >
            {isMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className={cn("flex-1 px-4 space-y-1", isMinimized && "px-2")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isMinimized ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold dark:font-bold transition-all",
                  isMinimized ? "justify-center px-0 w-12 mx-auto" : "px-3",
                  isActive
                    ? "bg-indigo/10 text-indigo ring-1 ring-indigo/20"
                    : "text-muted hover:bg-indigo/5 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isMinimized && <span className="truncate animate-in fade-in duration-200">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={cn("p-4 border-t border-border space-y-1.5", isMinimized && "p-2 flex flex-col items-center")}>
          <button
            onClick={toggleTheme}
            title={isMinimized ? (theme === "light" ? "Modo Escuro" : "Modo Claro") : undefined}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors text-muted hover:bg-indigo/5 hover:text-foreground",
              isMinimized ? "justify-center px-0 w-12 h-10" : "px-3"
            )}
          >
            {theme === "light" ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
            {!isMinimized && <span className="animate-in fade-in duration-200">{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>}
          </button>

          <button
            onClick={handleSignOut}
            title={isMinimized ? "Sair" : undefined}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400",
              isMinimized ? "justify-center px-0 w-12 h-10" : "px-3"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isMinimized && <span className="animate-in fade-in duration-200">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Barra de Navegação Inferior no Mobile */}
      < nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/85 backdrop-blur-lg border-t border-border px-2 py-2 flex justify-around items-center z-45 shadow-lg" >
        {
          mainMobileItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1",
                  isActive ? "text-indigo font-bold" : "text-muted"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "fill-indigo/10")} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            )
          })
        }

        {/* Botão "Mais" Drawer Trigger */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 text-muted hover:text-indigo"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tight">Mais</span>
        </button>
      </nav >

      {/* Gaveta de Opções "Mais" (Bottom Sheet) no Mobile */}
      {
        isMoreOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 flex items-end justify-center animate-in fade-in"
            onClick={() => setIsMoreOpen(false)}
          >
            <div
              className="w-full bg-surface border-t border-border rounded-t-[32px] p-6 pb-12 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo" />
                  Opções
                </h3>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-muted/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {moreMobileItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border border-border bg-muted/[0.03]",
                        isActive
                          ? "bg-indigo/5 text-indigo border-indigo/15 font-bold"
                          : "text-muted hover:bg-muted/10 hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center">{item.label}</span>
                    </Link>
                  )
                })}

                <button
                  onClick={() => {
                    toggleTheme()
                    setIsMoreOpen(false)
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-muted/[0.03] text-muted hover:bg-muted/10 hover:text-foreground transition-all"
                >
                  {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center">Tema</span>
                </button>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setIsMoreOpen(false)
                    handleSignOut()
                  }}
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl text-sm font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  )
}

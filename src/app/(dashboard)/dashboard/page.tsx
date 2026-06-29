"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Habit, DailyTask } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Circle, Flame, Plus, Calendar as CalendarIcon, Loader2, Palette, Clock, ChevronDown, ChevronUp, X, Check, Image as ImageIcon, Sun, Moon, Link as LinkIcon, Sparkles, Upload } from "lucide-react"
import { format, isYesterday, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import confetti from "canvas-confetti"
import { completeHabit, createHabit } from "@/app/actions/habits"
import { CreateHabitModal } from "@/components/CreateHabitModal"
import { cn, parseTaskTitle, sortTasks } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { StickyNotes } from "@/components/StickyNotes"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { MinimalTimerWidget } from "@/components/MinimalTimerWidget"
import { useTheme, accentColors } from "@/components/ThemeProvider"

const coverOptions = [
  { id: "none", label: "Nenhuma", value: "none" },
  { id: "gradient-indigo", label: "Indigo Flow", value: "linear-gradient(90deg, #4f46e5 0%, #7b61ff 100%)" },
  { id: "gradient-sunset", label: "Sunset Glow", value: "linear-gradient(90deg, #f857a6 0%, #ff5858 100%)" },
  { id: "gradient-aurora", label: "Northern Lights", value: "linear-gradient(90deg, #0575e6 0%, #00f260 100%)" },
  { id: "gradient-ocean", label: "Ocean Breeze", value: "linear-gradient(90deg, #4b6cb7 0%, #182848 100%)" },
  { id: "gradient-lavender", label: "Classic Lavender", value: "linear-gradient(90deg, #834d9b 0%, #d04ed6 100%)" },
  { id: "gradient-neon", label: "Cosmic Neon", value: "linear-gradient(90deg, #ec008c 0%, #fc6767 100%)" },
]

const getCoverStyle = (coverVal: string) => {
  if (!coverVal || coverVal === "none") return "none"
  if (coverVal.startsWith("http") || coverVal.startsWith("/") || coverVal.startsWith("data:")) {
    return `url("${coverVal}") center/cover no-repeat`
  }
  const preset = coverOptions.find(o => o.id === coverVal)
  return preset ? preset.value : coverVal
}

// ---------------------------------------------------------------------------
// Helpers de storage isolado por usuário
// ---------------------------------------------------------------------------
function userKey(userId: string | null, key: string) {
  return userId ? `hf:${userId}:${key}` : `hf:anon:${key}`
}
function getStoredPref(userId: string | null, key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(userKey(userId, key))
}
function setStoredPref(userId: string | null, key: string, value: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(userKey(userId, key), value)
}

export default function DashboardPage() {
  const { theme, accent, customAccentColor, toggleTheme, changeAccent, setCustomAccent } = useTheme()
  const [habits, setHabits] = useState<Habit[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hideHabits, setHideHabits] = useState(false)
  const [hideTasks, setHideTasks] = useState(false)
  const [habitsCollapsed, setHabitsCollapsed] = useState(false)
  const [focusCollapsed, setFocusCollapsed] = useState(false)
  const [linkedBoards, setLinkedBoards] = useState<Record<string, string>>({})
  const [linkedTasks, setLinkedTasks] = useState<Record<string, string>>({})
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [cover, setCover] = useState<string>("gradient-indigo")
  const [customCoverUrl, setCustomCoverUrl] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [bannerText, setBannerText] = useState<string>("")
  const [bannerIcon, setBannerIcon] = useState<string>("")
  const supabase = createClient()

  // Carrega userId e preferências de UI isoladas por conta
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUserId(uid)

      // Preferências individuais por usuário
      const savedHideHabits = getStoredPref(uid, 'hideHabits')
      if (savedHideHabits) setHideHabits(savedHideHabits === 'true')

      const savedHideTasks = getStoredPref(uid, 'hideTasks')
      if (savedHideTasks) setHideTasks(savedHideTasks === 'true')

      const savedHabitsCollapsed = getStoredPref(uid, 'dashboard_habitsCollapsed')
      if (savedHabitsCollapsed) setHabitsCollapsed(savedHabitsCollapsed === 'true')

      const savedFocusCollapsed = getStoredPref(uid, 'dashboard_focusCollapsed')
      if (savedFocusCollapsed) setFocusCollapsed(savedFocusCollapsed === 'true')

      const savedBannerText = getStoredPref(uid, 'dashboard_bannerText')
      if (savedBannerText !== null) setBannerText(savedBannerText)

      const savedBannerIcon = getStoredPref(uid, 'dashboard_bannerIcon')
      if (savedBannerIcon !== null) setBannerIcon(savedBannerIcon)

      const savedCover = getStoredPref(uid, 'dashboard_cover')
      if (savedCover) {
        setCover(savedCover)
        if (savedCover.startsWith("http") || savedCover.startsWith("/")) {
          setCustomCoverUrl(savedCover)
        }
      }
    }
    init()
    fetchData()
  }, [])

  const toggleHideHabits = () => {
    const next = !hideHabits
    setHideHabits(next)
    setStoredPref(currentUserId, 'hideHabits', String(next))
  }

  const toggleHabitsCollapsed = () => {
    const next = !habitsCollapsed
    setHabitsCollapsed(next)
    setStoredPref(currentUserId, 'dashboard_habitsCollapsed', String(next))
  }

  const toggleFocusCollapsed = () => {
    const next = !focusCollapsed
    setFocusCollapsed(next)
    setStoredPref(currentUserId, 'dashboard_focusCollapsed', String(next))
  }

  const handleCoverChange = (newCover: string) => {
    setCover(newCover)
    setStoredPref(currentUserId, 'dashboard_cover', newCover)
  }

  const handleBannerTextChange = (text: string) => {
    setBannerText(text)
    setStoredPref(currentUserId, 'dashboard_bannerText', text)
  }

  const handleBannerIconChange = (icon: string) => {
    setBannerIcon(icon)
    setStoredPref(currentUserId, 'dashboard_bannerIcon', icon)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new globalThis.Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        // Target dimensions: 1200 x 400 (3:1 aspect ratio)
        const targetWidth = 1200
        const targetHeight = 400
        canvas.width = targetWidth
        canvas.height = targetHeight

        if (ctx) {
          const imgRatio = img.width / img.height
          const targetRatio = targetWidth / targetHeight

          let sourceX = 0
          let sourceY = 0
          let sourceWidth = img.width
          let sourceHeight = img.height

          if (imgRatio > targetRatio) {
            sourceWidth = img.height * targetRatio
            sourceX = (img.width - sourceWidth) / 2
          } else {
            sourceHeight = img.width / targetRatio
            sourceY = (img.height - sourceHeight) / 2
          }

          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
          )

          const base64 = canvas.toDataURL("image/jpeg", 0.7)
          handleCoverChange(base64)
          setCustomCoverUrl("")
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Buscar hábitos
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true })

      // 2. Buscar tarefas do dia
      const { data: tasksData } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('due_date', format(new Date(), 'yyyy-MM-dd'))
        .order('priority', { ascending: false })

      if (habitsData) setHabits(habitsData)
      if (tasksData) setTasks(sortTasks(tasksData))

      // 3. Buscar quadros brancos vinculados
      const { data: boardsData } = await supabase
        .from('habit_boards')
        .select('id, habit_id, task_id')

      if (boardsData) {
        const habitMap: Record<string, string> = {}
        const taskMap: Record<string, string> = {}
        boardsData.forEach(b => {
          if (b.habit_id) habitMap[b.habit_id] = b.id
          if (b.task_id) taskMap[b.task_id] = b.id
        })
        setLinkedBoards(habitMap)
        setLinkedTasks(taskMap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHabit = async (name: string, goal: string, interval: number) => {
    const result = await createHabit(name, goal, interval)
    if (result.success && result.habit) {
      setHabits([...habits, result.habit as Habit])
    }
  }

  const handleCompleteHabit = async (habit: Habit) => {
    if (habit.last_completed_at && isToday(parseISO(habit.last_completed_at))) {
      return
    }

    setCompletingId(habit.id)
    const result = await completeHabit(habit.id)

    if (result.success) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7B61FF', '#40C057', '#FF922B']
      })

      setHabits(habits.map(h =>
        h.id === habit.id
          ? { ...h, streak_count: result.newStreak ?? h.streak_count, last_completed_at: new Date().toISOString() }
          : h
      ))
    }
    setCompletingId(null)
  }

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t)))
    }
  }

  const getActiveStreak = (habit: Habit) => {
    if (!habit.last_completed_at) return 0
    const lastDate = parseISO(habit.last_completed_at)
    if (isToday(lastDate) || isYesterday(lastDate)) {
      return habit.streak_count
    }
    return 0
  }

  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        title: newTaskTitle,
        user_id: user?.id,
        due_date: format(new Date(), 'yyyy-MM-dd'),
        is_completed: false,
        priority: 1
      })
      .select()
      .single()

    if (!error && data) {
      setTasks(sortTasks([...tasks, data]))
      setNewTaskTitle("")
      setIsAddingTask(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Sincronizando seus hábitos...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 sm:pb-8">
      {cover !== "none" && (
        <div
          className="h-48 w-full rounded-3xl relative shadow-soft dark:shadow-2xl overflow-hidden group transition-all duration-300 flex items-end p-6"
          style={{
            background: getCoverStyle(cover)
          }}
        >
          {/* Overlay com glassmorphism contendo Ícone + Texto do Banner */}
          {(bannerIcon || bannerText) && (
            <div className="flex items-center gap-3 bg-surface/80 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg select-none max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
              {bannerIcon && <span className="text-2xl filter drop-shadow-md">{bannerIcon}</span>}
              {bannerText && (
                <span className="font-bold text-foreground text-sm sm:text-base tracking-wide drop-shadow-sm truncate">
                  {bannerText}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setIsPanelOpen(true)}
            className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 dark:bg-surface/90 backdrop-blur-md hover:bg-background text-foreground text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-border flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo" />
            Alterar Capa
          </button>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hoje</h1>
          <p className="text-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setIsPanelOpen(true)} className="flex-1 sm:flex-initial">
            <Palette className="w-4 h-4 mr-2" />
            Personalizar
          </Button>
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-initial">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Agenda
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden self-start">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-700 dark:text-foreground">
              <Flame className="w-5 h-5 text-indigo" />
              <span>Micro-Hábitos</span>
              <button
                onClick={toggleHideHabits}
                className="ml-1 text-muted hover:text-foreground transition-colors p-1"
                title={hideHabits ? "Mostrar hábitos" : "Ocultar hábitos"}
              >
                {hideHabits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo bg-indigo/5 dark:bg-indigo/10 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-indigo/10 dark:ring-0 w-fit shrink-0">
                {habits.filter(h => h.last_completed_at && isToday(parseISO(h.last_completed_at))).length}/{habits.length} Concluídos
              </span>
              <button
                onClick={toggleHabitsCollapsed}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all shrink-0"
                title={habitsCollapsed ? "Expandir" : "Minimizar"}
              >
                {habitsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </CardHeader>
          {!habitsCollapsed && (
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {habits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                    <Flame className="w-10 h-10 text-muted/30" />
                    <p className="text-sm text-muted font-medium">Nenhum hábito ainda.<br />Crie seu primeiro hábito!</p>
                  </div>
                ) : habits.map((habit) => {
                  const completedToday = habit.last_completed_at && isToday(parseISO(habit.last_completed_at))
                  const activeStreak = getActiveStreak(habit)

                  return (
                    <div
                      key={habit.id}
                      className={cn(
                        "flex items-center justify-between p-6 hover:bg-indigo/[0.02] transition-colors group",
                        completedToday && "opacity-50 grayscale-[0.5]"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => handleCompleteHabit(habit)}
                          disabled={completingId === habit.id || !!completedToday}
                          className={cn(
                            "relative transition-all duration-300 active:scale-90 disabled:opacity-100",
                            completedToday ? "cursor-default" : "cursor-pointer"
                          )}
                        >
                          {completingId === habit.id ? (
                            <Loader2 className="w-7 h-7 text-indigo animate-spin" />
                          ) : completedToday ? (
                            <div className="bg-green/10 p-1 rounded-full">
                              <CheckCircle2 className="w-7 h-7 text-green" />
                            </div>
                          ) : (
                            <Circle className="w-7 h-7 text-slate-300 dark:text-slate-700 group-hover:text-indigo/40 transition-colors" />
                          )}
                        </button>
                        <div>
                          <h3 className={cn(
                            "font-semibold dark:font-bold text-lg transition-all",
                            completedToday ? "text-muted line-through" : "text-slate-700 dark:text-foreground",
                            hideHabits && "filter blur-[4px] select-none"
                          )}>
                            {hideHabits ? "Nome Oculto" : habit.name}
                          </h3>
                          <p className={cn(
                            "text-sm text-muted font-medium",
                            hideHabits && "filter blur-[3px] select-none"
                          )}>
                            {hideHabits ? "Descrição confidencial" : habit.goal_description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {linkedBoards[habit.id] && (
                          <Link
                            href={`/whiteboards/board?id=${linkedBoards[habit.id]}`}
                            className="p-2 text-indigo bg-indigo/5 dark:bg-indigo/10 rounded-xl transition-all hover:bg-indigo hover:text-white ring-1 ring-indigo/10 dark:ring-0"
                            title="Abrir Quadro de Estudos"
                          >
                            <Palette className="w-4 h-4 animate-pulse" />
                          </Link>
                        )}
                        <div className={cn(
                          "flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all",
                          activeStreak > 0
                            ? "text-orange bg-orange/5 dark:bg-orange/10 ring-1 ring-orange/10 dark:ring-orange/20"
                            : "text-muted bg-muted/5",
                          hideHabits && "filter blur-[3px] select-none"
                        )}>
                          <Flame className={cn("w-4 h-4", activeStreak > 0 && "fill-current animate-pulse")} />
                          {hideHabits ? "••" : activeStreak}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>

        <div className="space-y-6">
          <MinimalTimerWidget />

          <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black flex items-center gap-2 tracking-widest text-slate-700 dark:text-foreground uppercase">
                <CheckCircle2 className="w-5 h-5 text-indigo" />
                Foco do Dia
              </CardTitle>
              <button
                onClick={toggleFocusCollapsed}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all shrink-0"
                title={focusCollapsed ? "Expandir" : "Minimizar"}
              >
                {focusCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </CardHeader>
            {!focusCollapsed && (
              <CardContent className="space-y-4">
                {tasks.map((task) => {
                  const { time, cleanTitle } = parseTaskTitle(task.title)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl hover:bg-muted/5 transition-colors cursor-pointer group",
                        task.is_completed && "opacity-40"
                      )}
                      onClick={() => toggleTask(task.id, task.is_completed)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-indigo/40" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-sm font-semibold dark:font-bold transition-all text-slate-700 dark:text-foreground truncate",
                            task.is_completed && "text-muted line-through",
                            hideTasks && "filter blur-[4px] select-none"
                          )}>
                            {hideTasks ? "Tarefa Oculta" : cleanTitle}
                          </span>
                          {time && !hideTasks && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo mt-0.5">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mostrar paleta se houver quadro vinculado a esta tarefa */}
                      {linkedTasks[task.id] && (
                        <Link
                          href={`/whiteboards/board?id=${linkedTasks[task.id]}`}
                          className="p-1.5 text-indigo bg-indigo/5 dark:bg-indigo/10 rounded-lg hover:bg-indigo hover:text-white transition-all ring-1 ring-indigo/10 dark:ring-0 shrink-0"
                          title="Abrir Quadro de Estudos da Tarefa"
                          onClick={(e) => e.stopPropagation()} // Previne marcar/desmarcar a tarefa ao clicar no quadro!
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )
                })}
                {isAddingTask ? (
                  <form onSubmit={handleAddTask} className="mt-2 animate-in slide-in-from-top-2">
                    <Input
                      autoFocus
                      placeholder="O que precisa ser feito?"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      className="text-sm h-9"
                      onBlur={() => !newTaskTitle && setIsAddingTask(false)}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button type="submit" size="sm" className="h-7 text-[10px] uppercase tracking-wider font-bold">Salvar</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-wider font-bold" onClick={() => setIsAddingTask(false)}>Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2 text-sm font-bold text-indigo hover:opacity-80 transition-all mt-2 p-2 px-3 rounded-lg hover:bg-indigo/5 w-full text-left"
                  >
                    <Plus className="w-4 h-4" />
                    Nova tarefa
                  </button>
                )}
              </CardContent>
            )}
          </Card>

          <section className="accent-gradient text-white rounded-3xl p-8 relative overflow-hidden shadow-soft dark:shadow-xl dark:shadow-indigo/20">
            <div className="relative z-10">
              <h3 className="font-black text-xl mb-2 tracking-tight">Dica de hoje</h3>
              <p className="text-white/80 text-sm leading-relaxed italic font-medium">
                "Não quebre a corrente. A cada dia que você marca o X, mais forte o hábito se torna."
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Flame className="w-32 h-32" />
            </div>
          </section>
        </div>
      </div>

      <StickyNotes />

      <CreateHabitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateHabit}
      />

      {/* Painel de Personalização Lateral */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop com blur */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsPanelOpen(false)}
          />

          {/* Gaveta */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <h2 className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo animate-pulse" />
                  Aparência
                </h2>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-muted/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Opções */}
              <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar">

                {/* 1. Tema */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted">Tema do Aplicativo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => theme === "dark" && toggleTheme()}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center cursor-pointer",
                        theme === "light"
                          ? "border-indigo bg-indigo/5 text-indigo font-bold shadow-sm"
                          : "border-border text-muted hover:bg-muted/5 hover:text-foreground"
                      )}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Modo Claro</span>
                    </button>
                    <button
                      onClick={() => theme === "light" && toggleTheme()}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center cursor-pointer",
                        theme === "dark"
                          ? "border-indigo bg-indigo/5 text-indigo font-bold shadow-sm"
                          : "border-border text-muted hover:bg-muted/5 hover:text-foreground"
                      )}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Modo Escuro</span>
                    </button>
                  </div>
                </div>

                {/* 2. Cor de Destaque */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted">Cor de Destaque</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {accentColors.map((color) => {
                      const isActive = accent === color.name
                      return (
                        <button
                          key={color.name}
                          onClick={() => changeAccent(color.name)}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer",
                            isActive
                              ? "border-indigo bg-indigo/5 font-bold text-foreground"
                              : "border-border hover:bg-muted/5 text-muted"
                          )}
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: theme === "dark" ? color.dark : color.light }}
                          />
                          <span className="text-xs truncate font-semibold">{color.label}</span>
                        </button>
                      )
                    })}
                    
                    {/* Botão Personalizado */}
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all col-span-3",
                      accent === "custom"
                        ? "border-indigo bg-indigo/5 font-bold text-foreground"
                        : "border-border hover:bg-muted/5 text-muted"
                    )}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <label className="relative cursor-pointer shrink-0 block w-5 h-5 rounded-full overflow-hidden border border-border/80 shadow-inner">
                          <input
                            type="color"
                            value={customAccentColor}
                            onChange={(e) => setCustomAccent(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div 
                            className="w-full h-full rounded-full" 
                            style={{ backgroundColor: customAccentColor }}
                          />
                        </label>
                        <span className="text-xs truncate font-semibold">Personalizada</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted bg-muted/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                        {customAccentColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Capa do Dashboard */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted">Capa do Dashboard</h3>

                  {/* Grid de Capas Prontas */}
                  <div className="grid grid-cols-2 gap-3">
                    {coverOptions.map((opt) => {
                      const isSelected = cover === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleCoverChange(opt.id)}
                          className={cn(
                            "group/opt flex flex-col rounded-2xl overflow-hidden border text-left transition-all h-24 relative shadow-sm cursor-pointer",
                            isSelected ? "border-indigo ring-2 ring-indigo/20" : "border-border hover:opacity-90"
                          )}
                        >
                          {opt.id === "none" ? (
                            <div className="flex-1 bg-muted/5 flex items-center justify-center text-xs font-bold text-muted uppercase tracking-wider">
                              Nenhuma
                            </div>
                          ) : (
                            <div
                              className="flex-1 w-full h-full"
                              style={{ background: opt.value }}
                            />
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-background/90 dark:bg-surface/90 backdrop-blur-sm p-1.5 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted truncate pr-2">{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo shrink-0" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Upload de Imagem */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-indigo" />
                      Enviar imagem do dispositivo
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="dashboard-cover-file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("dashboard-cover-file")?.click()}
                        className="w-full h-9 font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Escolher Arquivo
                      </Button>
                    </div>
                  </div>

                  {/* Input de URL de Imagem Customizada */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo" />
                      Ou link de imagem personalizado (Unsplash, etc)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Cole a URL da imagem..."
                        value={customCoverUrl}
                        onChange={(e) => setCustomCoverUrl(e.target.value)}
                        className="text-xs h-9 flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-9 font-bold px-4 cursor-pointer"
                        onClick={() => {
                          if (customCoverUrl.trim()) {
                            handleCoverChange(customCoverUrl.trim())
                          } else {
                            handleCoverChange("none")
                          }
                        }}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4. Conteúdo do Banner */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted">Conteúdo do Banner</h3>
                  
                  {/* Texto do Banner */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Frase ou Título no Banner
                    </label>
                    <Input
                      placeholder="Ex: Foco & Consistência..."
                      value={bannerText}
                      onChange={(e) => handleBannerTextChange(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Ícone / Emoji do Banner */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted flex justify-between items-center">
                      <span>Ícone (Emoji)</span>
                      <span className="text-[9px] text-indigo font-medium">Escolha ou digite um abaixo</span>
                    </label>
                    
                    {/* Lista rápida de emojis */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {["🚀", "🔥", "🎯", "🧠", "💻", "💡", "🌟", "🌱", "⚡", "📅", "💪", "🌈"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleBannerIconChange(emoji)}
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all border",
                            bannerIcon === emoji
                              ? "border-indigo bg-indigo/10 scale-110 shadow-sm"
                              : "border-border hover:bg-muted/5 text-muted hover:text-foreground"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleBannerIconChange("")}
                        className={cn(
                          "px-2 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all border",
                          bannerIcon === ""
                            ? "border-indigo bg-indigo/10 scale-105"
                            : "border-border hover:bg-muted/5 text-muted"
                        )}
                      >
                        Nenhum
                      </button>
                    </div>

                    {/* Input customizado de emoji */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite outro emoji ou caractere..."
                        value={bannerIcon}
                        onChange={(e) => handleBannerIconChange(e.target.value.substring(0, 4))} // limita tamanho
                        className="text-xs h-9 flex-1"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

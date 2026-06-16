"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, RotateCcw, Timer as TimerIcon, Clock, Coffee, BookOpen, SkipForward, ListTodo, Zap, Award, CheckCircle2, Circle, Volume2, VolumeX, ChevronDown, ChevronUp, EyeOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, parseTaskTitle, sortTasks } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { DailyTask } from "@/types/database"
import { format } from "date-fns"

type Mode = "pomodoro" | "stopwatch"
type PomodoroState = "focus" | "shortBreak" | "longBreak"

const TIMER_STORAGE_KEY = "synca_active_timer"

export default function FocusPage() {
  const [mode, setMode] = useState<Mode>("pomodoro")
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>("focus")
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [isActive, setIsActive] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("25")
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Wall-clock refs: evitam drift ao usar Date.now() em vez de contar ticks
  const endTimeRef = useRef<number | null>(null)   // timestamp ms em que o pomodoro termina
  const startTimeRef = useRef<number | null>(null) // timestamp ms em que o cronômetro começou
  const isRestoredRef = useRef(false)

  // Custom states
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [focusStats, setFocusStats] = useState({
    completedSessions: 0,
    totalMinutes: 0
  })
  const [hideTasks, setHideTasks] = useState(false)
  const [tasksCollapsed, setTasksCollapsed] = useState(false)

  const [showSpotify, setShowSpotify] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState("")
  const [spotifyInputError, setSpotifyInputError] = useState(false)
  // Fila de reprodução do Spotify
  const [spotifyQueue, setSpotifyQueue] = useState<{ url: string; embedSrc: string; label: string }[]>([])
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0)

  // Extrai tipo (playlist/album/track/artist) e ID de qualquer URL do Spotify de forma robusta e flexível
  const parseSpotifyUrl = (url: string): { type: string; id: string } | null => {
    try {
      // Regex genérica e super tolerante que busca qualquer padrão /tipo/id
      const match = url.match(/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/)
      if (match) return { type: match[1], id: match[2] }
      
      // Suporte para URI Spotify (spotify:playlist:ID)
      const uriMatch = url.match(/spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)/)
      if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] }
      
      return null
    } catch {
      return null
    }
  }

  const handleSpotifyAdd = () => {
    const parsed = parseSpotifyUrl(spotifyUrl)
    if (parsed) {
      const embedSrc = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator`
      const typeLabel = { playlist: 'Playlist', album: 'Álbum', track: 'Música', artist: 'Artista' }[parsed.type] ?? parsed.type
      const shortId = parsed.id.slice(0, 8)
      setSpotifyQueue(prev => [...prev, { url: spotifyUrl, embedSrc, label: `${typeLabel} · ${shortId}...` }])
      setSpotifyUrl("")
      setSpotifyInputError(false)
      // Avança para o item recém-adicionado se for o primeiro
      setCurrentTrackIdx(prev => spotifyQueue.length === 0 ? 0 : prev)
    } else {
      setSpotifyInputError(true)
    }
  }

  const handleSpotifyRemove = (idx: number) => {
    setSpotifyQueue(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (currentTrackIdx >= next.length) setCurrentTrackIdx(Math.max(0, next.length - 1))
      return next
    })
  }

  // Rain Audio Synthesizer States (Web Audio API)
  const [isSoundOn, setIsSoundOn] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rainSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const rainGainRef = useRef<GainNode | null>(null)

  // Pomodoro settings in minutes (as state to allow changes)
  const [pomodoroSettings, setPomodoroSettings] = useState({
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  })

  const supabase = createClient()

  // ─── Restaurar estado do timer do localStorage ao montar ──────────────────
  useEffect(() => {
    if (isRestoredRef.current) return
    isRestoredRef.current = true

    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (raw) {
      try {
        const s = JSON.parse(raw)
        const m: Mode = s.mode === "stopwatch" ? "stopwatch" : "pomodoro"
        const ps: PomodoroState = (["focus", "shortBreak", "longBreak"].includes(s.pomodoroState) ? s.pomodoroState : "focus") as PomodoroState
        const settings = s.pomodoroSettings ?? { focus: 25, shortBreak: 5, longBreak: 15 }

        setMode(m)
        setPomodoroState(ps)
        setPomodoroSettings(settings)

        if (s.isActive) {
          if (m === "pomodoro" && s.endTime) {
            const remaining = Math.ceil((s.endTime - Date.now()) / 1000)
            if (remaining > 0) {
              endTimeRef.current = s.endTime
              setTimeLeft(remaining)
              setIsActive(true)
            } else {
              setTimeLeft(0)
            }
          } else if (m === "stopwatch" && s.startTime) {
            startTimeRef.current = s.startTime
            setStopwatchTime(Math.floor((Date.now() - s.startTime) / 1000))
            setIsActive(true)
          }
        } else {
          if (m === "pomodoro") setTimeLeft(s.timeLeft ?? settings[ps] * 60)
          else setStopwatchTime(s.stopwatchTime ?? 0)
        }
      } catch {
        // JSON corrompido — ignora
      }
    }
  }, [])

  // Fetch tasks and statistics
  useEffect(() => {
    fetchTasks()
    
    // Ler preferência de ocultação de tarefas do localStorage (compartilhado com a aba Tarefas)
    const savedHideTasks = localStorage.getItem('hideTasks')
    if (savedHideTasks) setHideTasks(savedHideTasks === 'true')

    // Load local storage stats for today
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const savedStats = localStorage.getItem("synca_focus_stats")
    if (savedStats) {
      const parsed = JSON.parse(savedStats)
      if (parsed.date === todayStr) {
        setFocusStats({
          completedSessions: parsed.completedSessions || 0,
          totalMinutes: parsed.totalMinutes || 0
        })
      } else {
        // Novo dia, inicializa
        const newStats = { date: todayStr, completedSessions: 0, totalMinutes: 0 }
        setFocusStats(newStats)
        localStorage.setItem("synca_focus_stats", JSON.stringify(newStats))
      }
    } else {
      const newStats = { date: todayStr, completedSessions: 0, totalMinutes: 0 }
      setFocusStats(newStats)
      localStorage.setItem("synca_focus_stats", JSON.stringify(newStats))
    }

    return () => {
      stopRainSound()
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [])

  // ─── Sincronizar estado do timer → localStorage ────────────────────────────
  useEffect(() => {
    if (!isRestoredRef.current) return
    const state = {
      mode,
      pomodoroState,
      pomodoroSettings,
      isActive,
      timeLeft,
      stopwatchTime,
      endTime: isActive && mode === "pomodoro" ? endTimeRef.current : null,
      startTime: isActive && mode === "stopwatch" ? startTimeRef.current : null,
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
  }, [mode, pomodoroState, pomodoroSettings, isActive, timeLeft, stopwatchTime])

  // Web Audio Rain Sound Synthesis (Brown Noise + Lowpass Filter)
  const startRainSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      if (rainSourceRef.current) return // Já está tocando

      // Brown Noise generation buffer
      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        output[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = output[i]
        output[i] *= 3.5 // compensar ganho do ruído marrom
      }

      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer
      source.loop = true

      // Filtro passa-baixa para suavizar o som e deixá-lo parecido com chuva confortável
      const filter = ctx.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 850

      const gain = ctx.createGain()
      gain.gain.value = 0.12 // volume confortável em 12%

      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      source.start(0)
      rainSourceRef.current = source
      rainGainRef.current = gain
    } catch (e) {
      console.error("Audio Context rain generation failed:", e)
    }
  }

  const stopRainSound = () => {
    if (rainSourceRef.current) {
      try {
        rainSourceRef.current.stop()
      } catch (e) {}
      rainSourceRef.current.disconnect()
      rainSourceRef.current = null
    }
  }

  useEffect(() => {
    if (isSoundOn) {
      startRainSound()
    } else {
      stopRainSound()
    }
  }, [isSoundOn])

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('daily_tasks')
        .select('*')
      if (data) setTasks(sortTasks(data))
    } catch (err) {
      console.error("Error loading tasks for focus page:", err)
    }
  }

  const toggleTask = async (task: DailyTask) => {
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)

    if (!error) {
      setTasks(sortTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !task.is_completed } : t)))
      if (task.id === selectedTaskId && !task.is_completed) {
        setSelectedTaskId("")
      }
    }
  }

  // Handle mode switch
  const handleModeChange = (newMode: Mode) => {
    if (timerRef.current) clearInterval(timerRef.current)
    endTimeRef.current = null
    startTimeRef.current = null
    setMode(newMode)
    setIsActive(false)
    setIsEditing(false)
  }

  // Handle Pomodoro state switch (Cores roxo/índigo e verde puras)
  const handlePomodoroStateChange = (newState: PomodoroState) => {
    if (timerRef.current) clearInterval(timerRef.current)
    endTimeRef.current = null
    startTimeRef.current = null
    setPomodoroState(newState)
    setTimeLeft(pomodoroSettings[newState] * 60)
    setIsActive(false)
    setIsEditing(false)
  }

  // ─── Loop do timer com wall-clock (sem drift) ─────────────────────────────
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      if (mode === "pomodoro") {
        if (!endTimeRef.current) return
        const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000)
        if (remaining <= 0) {
          setTimeLeft(0)
          endTimeRef.current = null
          setIsActive(false)
          handleTimerCompletion()
        } else {
          setTimeLeft(remaining)
        }
      } else {
        if (!startTimeRef.current) return
        setStopwatchTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 500) // 500ms para maior precisão na exibição

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, mode])

  const handleTimerCompletion = async () => {
    setIsActive(false)
    if (timerRef.current) clearInterval(timerRef.current)
    
    let minutesFocused = 0
    let completedSessionsInc = 0

    if (pomodoroState === "focus") {
      minutesFocused = pomodoroSettings.focus
      completedSessionsInc = 1
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const newStats = {
      date: todayStr,
      completedSessions: focusStats.completedSessions + completedSessionsInc,
      totalMinutes: focusStats.totalMinutes + minutesFocused
    }
    setFocusStats(newStats)
    localStorage.setItem("synca_focus_stats", JSON.stringify(newStats))

    // Marcar tarefa selecionada como concluída automaticamente
    if (pomodoroState === "focus" && selectedTaskId) {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ is_completed: true })
        .eq('id', selectedTaskId)
      
      if (!error) {
        setTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, is_completed: true } : t))
        setSelectedTaskId("")
      }
    }

    playBeepSound()
  }

  const playBeepSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(523.25, context.currentTime) // Nota Dó (C5)
      gain.gain.setValueAtTime(0.25, context.currentTime)
      osc.connect(gain)
      gain.connect(context.destination)
      osc.start()
      osc.stop(context.currentTime + 1.2)
    } catch (e) {
      console.log("Audio alarm blocked by browser policy:", e)
    }
  }

  // Format time function
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    if (isActive) {
      // Pausar: zera refs de wall-clock
      endTimeRef.current = null
      startTimeRef.current = null
      setIsActive(false)
    } else {
      // Iniciar / retomar
      if (mode === "pomodoro") {
        const tl = timeLeft === 0 ? pomodoroSettings[pomodoroState] * 60 : timeLeft
        if (timeLeft === 0) setTimeLeft(tl)
        endTimeRef.current = Date.now() + tl * 1000
      } else {
        startTimeRef.current = Date.now() - stopwatchTime * 1000
      }
      setIsEditing(false)
      setIsActive(true)
    }
  }

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    endTimeRef.current = null
    startTimeRef.current = null
    setIsActive(false)
    setIsEditing(false)
    
    if (mode === "pomodoro") {
      setTimeLeft(pomodoroSettings[pomodoroState] * 60)
    } else {
      if (stopwatchTime >= 60) {
        const mins = Math.floor(stopwatchTime / 60)
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const newStats = {
          date: todayStr,
          completedSessions: focusStats.completedSessions,
          totalMinutes: focusStats.totalMinutes + mins
        }
        setFocusStats(newStats)
        localStorage.setItem("synca_focus_stats", JSON.stringify(newStats))

        // Tocar som ao finalizar sessão do cronômetro
        playBeepSound()

        if (selectedTaskId) {
          supabase
            .from('daily_tasks')
            .update({ is_completed: true })
            .eq('id', selectedTaskId)
            .then(({ error }) => {
              if (!error) {
                setTasks(prev => sortTasks(prev.map(t => t.id === selectedTaskId ? { ...t, is_completed: true } : t)))
                setSelectedTaskId("")
              }
            })
        }
      }
      setStopwatchTime(0)
    }
  }

  const skipTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    endTimeRef.current = null
    startTimeRef.current = null
    setIsActive(false)
    setIsEditing(false)
    
    if (mode === "pomodoro") {
      if (pomodoroState === "focus") {
        handlePomodoroStateChange("shortBreak")
      } else if (pomodoroState === "shortBreak") {
        handlePomodoroStateChange("longBreak")
      } else {
        handlePomodoroStateChange("focus")
      }
    }
  }

  const saveCustomTime = () => {
    const mins = parseInt(editValue, 10)
    if (!isNaN(mins) && mins > 0) {
      setPomodoroSettings(prev => ({
        ...prev,
        [pomodoroState]: mins
      }))
      setTimeLeft(mins * 60)
    }
    setIsEditing(false)
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  // Calculate progress for Pomodoro circle
  const totalTime = mode === "pomodoro" ? pomodoroSettings[pomodoroState] * 60 : null
  const progress = totalTime ? ((totalTime - timeLeft) / totalTime) * 100 : 0
  const circumference = 2 * Math.PI * 96
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Modo Foco</h1>
          <p className="text-muted">Concentre-se no que é importante e elimine distrações.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna da Esquerda: Temporizador */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-indigo/5 to-transparent pointer-events-none" />
            
            <CardContent className="p-6 sm:p-8 flex flex-col items-center relative z-10">
              
              {/* Seletor de Modo - Usando cor de fundo do tema neutro, sem tons azulados */}
              <div className="bg-slate-100 dark:bg-background p-1 rounded-2xl flex gap-1 w-full max-w-xs mb-6 border border-border">
                <button
                  onClick={() => handleModeChange("pomodoro")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition-all",
                    mode === "pomodoro" ? "btn-indigo-active shadow-md" : "text-muted hover:text-foreground"
                  )}
                >
                  <TimerIcon className="w-3.5 h-3.5" />
                  Pomodoro
                </button>
                <button
                  onClick={() => handleModeChange("stopwatch")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition-all",
                    mode === "stopwatch" ? "btn-indigo-active shadow-md" : "text-muted hover:text-foreground"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Cronômetro
                </button>
              </div>

              {/* Seletor de Fases do Pomodoro */}
              {mode === "pomodoro" && (
                <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                  <button
                    onClick={() => handlePomodoroStateChange("focus")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      pomodoroState === "focus"
                        ? "bg-[var(--indigo)]/10 text-[var(--indigo)] ring-1 ring-[var(--indigo)]/20"
                        : "bg-muted/5 text-muted hover:bg-muted/10 hover:text-foreground"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Foco ({pomodoroSettings.focus}m)
                  </button>
                  <button
                    onClick={() => handlePomodoroStateChange("shortBreak")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      pomodoroState === "shortBreak"
                        ? "bg-green/10 text-green ring-1 ring-green/20"
                        : "bg-muted/5 text-muted hover:bg-muted/10 hover:text-foreground"
                    )}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Pausa Curta ({pomodoroSettings.shortBreak}m)
                  </button>
                  <button
                    onClick={() => handlePomodoroStateChange("longBreak")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      pomodoroState === "longBreak"
                        ? "bg-[var(--indigo)]/10 text-[var(--indigo)] ring-1 ring-[var(--indigo)]/20"
                        : "bg-muted/5 text-muted hover:bg-muted/10 hover:text-foreground"
                    )}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Pausa Longa ({pomodoroSettings.longBreak}m)
                  </button>
                </div>
              )}

              {/* Seletor de Tarefa Vinculada para Foco */}
              <div className="w-full max-w-sm mb-6">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-border bg-surface p-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo text-slate-700 dark:text-foreground"
                >
                  <option value="">Selecione uma tarefa para focar</option>
                  {tasks.filter(t => !t.is_completed).map((task) => {
                    const { cleanTitle, time } = parseTaskTitle(task.title)
                    const displayTitle = hideTasks
                      ? (time ? `[${time}] Tarefa Oculta` : "Tarefa Oculta")
                      : (time ? `[${time}] ${cleanTitle}` : cleanTitle)
                    return (
                      <option key={task.id} value={task.id}>
                        {displayTitle}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Círculo do Temporizador */}
              <div className="relative flex items-center justify-center w-[220px] h-[220px] mb-6">
                <div className={cn(
                  "absolute w-36 h-36 rounded-full blur-2xl opacity-10 pointer-events-none transition-all duration-1000",
                  isActive && "animate-pulse duration-[2000ms]",
                  mode === "pomodoro" 
                    ? (pomodoroState === "focus" ? "bg-[var(--indigo)]" : pomodoroState === "shortBreak" ? "bg-green" : "bg-[var(--indigo)]")
                    : "bg-[var(--indigo)]"
                )} />

                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="96"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    className="text-slate-100 dark:text-slate-800/80"
                  />
                  {mode === "pomodoro" && (
                    <circle
                      cx="50%"
                      cy="50%"
                      r="96"
                      stroke="currentColor"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className={cn(
                        "transition-all duration-1000 ease-linear",
                        pomodoroState === "focus" ? "text-[var(--indigo)]" : 
                        pomodoroState === "shortBreak" ? "text-green" : "text-[var(--indigo)]"
                      )}
                    />
                  )}
                </svg>

                {mode === "stopwatch" && isActive && (
                  <div className="absolute inset-2 rounded-full border border-[var(--indigo)]/20 animate-ping duration-[3000ms]" />
                )}

                {/* Display do Tempo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 select-none">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={cn(
                          "w-16 text-4xl font-light bg-muted/10 border-b border-current px-1 py-0 text-center focus:outline-none tabular-nums",
                          pomodoroState === "focus" ? "text-[var(--indigo)]" : 
                          pomodoroState === "shortBreak" ? "text-green" : "text-[var(--indigo)]"
                        )}
                        min="1"
                        max="180"
                        autoFocus
                        onBlur={saveCustomTime}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCustomTime()
                          if (e.key === 'Escape') setIsEditing(false)
                        }}
                      />
                      <span className="text-[9px] font-bold text-muted uppercase bg-muted/10 px-1 py-0.5 rounded">min</span>
                    </div>
                  ) : (
                    <div className="relative group/time flex items-center justify-center w-full px-4">
                      <span 
                        onClick={() => {
                          if (!isActive && mode === "pomodoro") {
                            setEditValue(String(Math.floor(timeLeft / 60)))
                            setIsEditing(true)
                          }
                        }}
                        className={cn(
                          "text-5xl font-light tracking-wide transition-colors duration-300 tabular-nums",
                          mode === "pomodoro" 
                            ? (pomodoroState === "focus" ? "text-[var(--indigo)]" : pomodoroState === "shortBreak" ? "text-green" : "text-[var(--indigo)]")
                            : "text-[var(--indigo)]",
                          !isActive && mode === "pomodoro" && "cursor-pointer hover:opacity-85"
                        )}
                        title={!isActive && mode === "pomodoro" ? "Clique para editar os minutos" : undefined}
                      >
                        {mode === "pomodoro" ? formatTime(timeLeft) : formatTime(stopwatchTime)}
                      </span>
                      {!isActive && mode === "pomodoro" && (
                        <button 
                          onClick={() => {
                            setEditValue(String(Math.floor(timeLeft / 60)))
                            setIsEditing(true)
                          }}
                          className="absolute right-4 opacity-0 group-hover/time:opacity-100 transition-opacity duration-200 p-0.5 text-muted hover:text-[var(--indigo)]"
                          title="Editar tempo"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {selectedTask ? (
                    <span className="text-[9px] font-bold text-[var(--indigo)] dark:text-indigo-450 max-w-[140px] truncate mt-1 animate-pulse" title={hideTasks ? "Tarefa Oculta" : parseTaskTitle(selectedTask.title).cleanTitle}>
                      {hideTasks ? (
                        <span className="flex items-center gap-0.5"><EyeOff className="w-2.5 h-2.5" /> Oculta</span>
                      ) : parseTaskTitle(selectedTask.title).cleanTitle}
                    </span>
                  ) : (
                    <span className="text-muted/50 font-bold uppercase tracking-widest text-[8px] mt-1.5">
                      {mode === "pomodoro" ? (pomodoroState === "focus" ? "Foco" : "Descanso") : "Decorrendo"}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões do Cronômetro */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={resetTimer}
                  className="h-12 w-12 p-0 rounded-2xl border-2 hover:bg-muted/10 transition-all hover:rotate-180 duration-500"
                  title="Reiniciar"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button
                  size="lg"
                  onClick={toggleTimer}
                  className={cn(
                    "h-12 px-6 rounded-2xl text-sm font-bold transition-all shadow-md active:scale-98 shrink-0",
                    isActive
                      ? "bg-surface border-2 border-[var(--indigo)] text-[var(--indigo)] hover:bg-[var(--indigo)]/5"
                      : "bg-[var(--indigo)] text-white hover:opacity-90 shadow-[var(--indigo)]/15"
                  )}
                >
                  {isActive ? (
                    <>
                      <Pause className="w-4 h-4 mr-1.5 fill-current" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1.5 fill-current" />
                      Iniciar
                    </>
                  )}
                </Button>

                {mode === "pomodoro" && (
                  <Button
                    variant="outline"
                    onClick={skipTimer}
                    className="h-12 w-12 p-0 rounded-2xl border-2 hover:bg-muted/10 transition-all"
                    title="Pular Fase"
                  >
                    <SkipForward className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>

              {/* Botões Extras de Som (Chuva e Spotify) */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsSoundOn(!isSoundOn)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
                    isSoundOn 
                      ? "text-[var(--indigo)] bg-[var(--indigo)]/5 border-[var(--indigo)]/20 ring-1 ring-[var(--indigo)]/15 animate-pulse" 
                      : "text-muted border-border hover:bg-muted/5"
                  )}
                  title="Sintetizar som de chuva para concentração"
                >
                  {isSoundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Chuva de Foco</span>
                </button>

                <button
                  onClick={() => setShowSpotify(!showSpotify)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
                    showSpotify 
                      ? "text-[#1DB954] bg-[#1DB954]/5 border-[#1DB954]/20 ring-1 ring-[#1DB954]/15" 
                      : "text-muted border-border hover:bg-muted/5"
                  )}
                  title="Mostrar reprodutor do Spotify"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.502 9.82 1.13.294.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.673-1.114 8.243-.57 11.342 1.336.368.226.488.707.26 1.074zm.106-2.833C14.392 8.78 8.417 8.58 4.967 9.627c-.53.16-1.09-.142-1.25-.672-.16-.53.142-1.09.672-1.25 3.963-1.202 10.55-.97 14.62 1.448.477.283.633.9.35 1.378-.283.477-.9.633-1.377.35z"/>
                  </svg>
                  <span>Música de Foco</span>
                </button>
              </div>

              {/* Player do Spotify — Fila de repodução */}
              {showSpotify && (
                <div className="w-full max-w-sm mt-6 border-t border-border/50 pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="text-[9px] font-black text-muted uppercase tracking-widest block">
                    Spotify — Fila de Música
                  </span>

                  {/* Input de URL */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={spotifyUrl}
                      onChange={(e) => { setSpotifyUrl(e.target.value); setSpotifyInputError(false) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSpotifyAdd() }}
                      placeholder="Cole o link de playlist, álbum ou música..."
                      className={cn(
                        "flex-1 text-[10px] rounded-xl border bg-surface px-3 py-2 focus:outline-none focus:ring-1 text-slate-700 dark:text-foreground placeholder:text-muted/50 transition-all",
                        spotifyInputError ? "border-red-400 ring-1 ring-red-400/30" : "border-border"
                      )}
                    />
                    <button
                      onClick={handleSpotifyAdd}
                      className="text-[10px] font-black px-3 py-2 rounded-xl bg-[#1DB954] text-white hover:bg-[#18a349] transition-all shrink-0"
                    >
                      + Adicionar
                    </button>
                  </div>

                  {spotifyInputError && (
                    <p className="text-[9px] text-red-400 font-semibold">
                      URL inválida. Cole um link do Spotify (playlist, álbum ou música).
                    </p>
                  )}

                  {/* Fila de itens */}
                  {spotifyQueue.length > 0 ? (
                    <>
                      {/* Lista da fila */}
                      <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                        {spotifyQueue.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setCurrentTrackIdx(idx)}
                            className={cn(
                              "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-[10px] font-semibold group",
                              idx === currentTrackIdx
                                ? "bg-[#1DB954]/10 text-[#1DB954] ring-1 ring-[#1DB954]/20"
                                : "text-muted hover:bg-muted/5 hover:text-foreground"
                            )}
                          >
                            <span className="truncate flex-1">
                              {idx === currentTrackIdx && <span className="mr-1">▶</span>}
                              {item.label}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSpotifyRemove(idx) }}
                              className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all shrink-0 font-black text-[10px] px-1"
                              title="Remover da fila"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Navegação prev/next */}
                      {spotifyQueue.length > 1 && (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setCurrentTrackIdx(i => (i - 1 + spotifyQueue.length) % spotifyQueue.length)}
                            className="text-[9px] font-black text-muted hover:text-foreground transition-all px-2 py-1 rounded-lg hover:bg-muted/5"
                          >
                            ← Anterior
                          </button>
                          <span className="text-[9px] text-muted tabular-nums">
                            {currentTrackIdx + 1} / {spotifyQueue.length}
                          </span>
                          <button
                            onClick={() => setCurrentTrackIdx(i => (i + 1) % spotifyQueue.length)}
                            className="text-[9px] font-black text-muted hover:text-foreground transition-all px-2 py-1 rounded-lg hover:bg-muted/5"
                          >
                            Próxima →
                          </button>
                        </div>
                      )}

                      {/* Player embed */}
                      <iframe
                        key={spotifyQueue[currentTrackIdx]?.embedSrc}
                        src={spotifyQueue[currentTrackIdx]?.embedSrc}
                        width="100%"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-xl border-0 bg-transparent"
                      />
                    </>
                  ) : (
                    <p className="text-[9px] text-muted text-center py-3">
                      Cole um link do Spotify e clique em <strong>+ Adicionar</strong> para criar sua fila.
                    </p>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita: Mini-Gerenciador de Tarefas e Estatísticas */}
        <div className="space-y-6">
          
          {/* Estatísticas de Foco do Dia */}
          <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--indigo)] fill-[var(--indigo)]/10" />
                Sessão de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <div className="bg-muted/5 p-3 rounded-2xl border border-border/10 flex flex-col justify-center">
                <span className="text-2xl font-light text-[var(--indigo)] tabular-nums">{focusStats.completedSessions}</span>
                <span className="text-[9px] font-black text-muted uppercase tracking-wider mt-1">Pomodoros</span>
              </div>
              <div className="bg-muted/5 p-3 rounded-2xl border border-border/10 flex flex-col justify-center">
                <span className="text-2xl font-light text-[var(--indigo)] tabular-nums">{focusStats.totalMinutes}m</span>
                <span className="text-[9px] font-black text-muted uppercase tracking-wider mt-1">Total Focado</span>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Tarefas */}
          <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-[var(--indigo)]" />
                Tarefas Rápidas
                {hideTasks && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-[8px] font-bold text-muted uppercase">
                    <EyeOff className="w-2.5 h-2.5" /> Ocultas
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-[var(--indigo)] bg-[var(--indigo)]/5 px-2 py-0.5 rounded-full shrink-0">
                  {tasks.filter(t => !t.is_completed).length} Pendentes
                </span>
                <button
                  onClick={() => setTasksCollapsed(v => !v)}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-all"
                  title={tasksCollapsed ? "Expandir tarefas" : "Minimizar tarefas"}
                >
                  {tasksCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </CardHeader>
            {!tasksCollapsed && (
              <CardContent className="p-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted">
                    Nenhuma tarefa registrada para hoje.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/5 transition-all cursor-pointer group",
                          task.is_completed && "opacity-40"
                        )}
                      >
                        <div className="shrink-0">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-[var(--indigo)]/40" />
                          )}
                        </div>
                        {(() => {
                          const { time, cleanTitle } = parseTaskTitle(task.title)
                          return (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "text-xs font-semibold transition-all text-slate-700 dark:text-foreground truncate",
                                task.is_completed && "line-through text-muted",
                                hideTasks && "filter blur-[4px] select-none"
                              )}>
                                {hideTasks ? "Tarefa Oculta" : cleanTitle}
                              </span>
                              {time && !hideTasks && (
                                <span className="text-[9px] font-bold text-[var(--indigo)] bg-[var(--indigo)]/5 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {time}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Card de Concentração */}
          <section className="accent-gradient text-white rounded-3xl p-6 relative overflow-hidden shadow-soft dark:shadow-xl dark:shadow-indigo/20">
            <div className="relative z-10">
              <h3 className="font-black text-sm uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Concentração
              </h3>
              <p className="text-white/80 text-xs leading-relaxed italic font-medium">
                Eliminar distrações e focar por 25 minutos é mais valioso do que 3 horas de estudo multitarefa.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, RotateCcw, Timer as TimerIcon, Clock, Settings2, SkipForward } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import Link from "next/link"

type Mode = "pomodoro" | "stopwatch"

export function MinimalTimerWidget() {
  const [mode, setMode] = useState<Mode>("pomodoro")
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [isActive, setIsActive] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("25")
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setIsActive(false)
    setIsEditing(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === "pomodoro") {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              setIsActive(false)
              if (timerRef.current) clearInterval(timerRef.current)
              return 0
            }
            return prevTime - 1
          })
        } else {
          setStopwatchTime((prevTime) => prevTime + 1)
        }
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, mode])

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
    if (mode === "pomodoro" && timeLeft === 0) {
      setTimeLeft(pomodoroMinutes * 60)
    }
    setIsEditing(false)
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setIsEditing(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (mode === "pomodoro") {
      setTimeLeft(pomodoroMinutes * 60)
    } else {
      setStopwatchTime(0)
    }
  }

  const skipTimer = () => {
    setIsActive(false)
    setIsEditing(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (mode === "pomodoro") {
      setTimeLeft(0)
    } else {
      setStopwatchTime(0)
    }
  }

  const saveCustomTime = () => {
    const mins = parseInt(editValue, 10)
    if (!isNaN(mins) && mins > 0) {
      setPomodoroMinutes(mins)
      setTimeLeft(mins * 60)
    }
    setIsEditing(false)
  }

  // Círculo de progresso
  const totalTime = mode === "pomodoro" ? pomodoroMinutes * 60 : null
  const progress = totalTime ? ((totalTime - timeLeft) / totalTime) * 100 : 0
  const circumference = 2 * Math.PI * 76 // r = 76
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface relative overflow-hidden flex flex-col justify-between py-2">
      <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black flex items-center gap-2 tracking-widest text-slate-700 dark:text-foreground uppercase">
          {mode === "pomodoro" ? (
            <TimerIcon className="w-5 h-5 text-indigo" />
          ) : (
            <Clock className="w-5 h-5 text-indigo" />
          )}
          Foco Rápido
        </CardTitle>
        
        <Link href="/focus" title="Abrir Modo Foco Completo">
          <Button variant="ghost" className="w-8 h-8 p-0 rounded-full hover:bg-indigo/10 text-muted hover:text-indigo transition-colors">
            <Settings2 className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10 flex flex-col justify-center">
        {/* Seletor de Modo */}
        <div className="flex bg-slate-100 dark:bg-background p-1 rounded-2xl border border-border">
          <button
            onClick={() => handleModeChange("pomodoro")}
            className={cn(
              "flex-1 text-xs font-bold py-2.5 rounded-xl transition-all",
              mode === "pomodoro" ? "btn-indigo-active shadow-md" : "text-muted hover:text-foreground"
            )}
          >
            Pomodoro
          </button>
          <button
            onClick={() => handleModeChange("stopwatch")}
            className={cn(
              "flex-1 text-xs font-bold py-2.5 rounded-xl transition-all",
              mode === "stopwatch" ? "btn-indigo-active shadow-md" : "text-muted hover:text-foreground"
            )}
          >
            Cronômetro
          </button>
        </div>

        {/* Display do Círculo */}
        <div className="relative flex items-center justify-center w-44 h-44 mx-auto">
          {/* Círculo do Cronômetro */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="76"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            {mode === "pomodoro" && (
              <circle
                cx="50%"
                cy="50%"
                r="76"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-[var(--indigo)] transition-all duration-1000 ease-linear"
              />
            )}
          </svg>

          {/* Informações Centrais */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 select-none">
            {isEditing ? (
              <div className="flex items-center justify-center gap-0.5">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-14 text-3xl font-light bg-muted/10 border-b border-[var(--indigo)]/40 px-1 py-0 text-center focus:outline-none focus:border-[var(--indigo)] tabular-nums text-[var(--indigo)]"
                  min="1"
                  max="180"
                  autoFocus
                  onBlur={saveCustomTime}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCustomTime()
                    if (e.key === 'Escape') setIsEditing(false)
                  }}
                />
                <span className="text-[9px] font-bold text-muted uppercase tracking-wider bg-muted/5 px-1 py-0.5 rounded">min</span>
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
                    "text-3xl font-light tabular-nums tracking-wide transition-colors select-none",
                    isActive ? "text-[var(--indigo)]" : "text-slate-700 dark:text-foreground",
                    !isActive && mode === "pomodoro" && "cursor-pointer hover:text-[var(--indigo)]"
                  )}
                  title={!isActive && mode === "pomodoro" ? "Clique para editar" : undefined}
                >
                  {mode === "pomodoro" ? formatTime(timeLeft) : formatTime(stopwatchTime)}
                </span>
                {!isActive && mode === "pomodoro" && (
                  <button 
                    onClick={() => {
                      setEditValue(String(Math.floor(timeLeft / 60)))
                      setIsEditing(true)
                    }}
                    className="absolute right-3 opacity-0 group-hover/time:opacity-100 transition-opacity p-0.5 text-muted hover:text-[var(--indigo)]"
                    title="Editar tempo"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <span className="text-[8px] font-black text-muted/60 uppercase tracking-widest mt-1">
              {mode === "pomodoro" ? "Tempo Restante" : "Tempo Decorrido"}
            </span>
          </div>
        </div>

        {/* Controles de Ação */}
        <div className="flex items-center justify-center gap-5 mt-2">
          {/* Botão de Reset */}
          <Button
            variant="outline"
            onClick={resetTimer}
            className="h-10 w-10 p-0 rounded-full border border-border hover:bg-muted/10 transition-all hover:-rotate-90 duration-300"
            title="Reiniciar"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </Button>

          {/* Botão Play/Pause Grande */}
          <button
            onClick={toggleTimer}
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0 border-2",
              isActive 
                ? "bg-transparent border-[var(--indigo)] text-[var(--indigo)] hover:bg-[var(--indigo)]/5" 
                : "bg-[var(--indigo)] border-transparent text-white shadow-[var(--indigo)]/20 hover:opacity-90"
            )}
          >
            {isActive ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>

          {/* Botão de Skip */}
          <Button
            variant="outline"
            onClick={skipTimer}
            className="h-10 w-10 p-0 rounded-full border border-border hover:bg-muted/10 transition-all"
            title="Pular"
          >
            <SkipForward className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

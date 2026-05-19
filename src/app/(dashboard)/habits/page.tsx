"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Habit } from "@/types/database"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Plus, Flame, Loader2, Trash2, Edit2 } from "lucide-react"
import { CreateHabitModal } from "@/components/CreateHabitModal"
import { createHabit, updateHabit } from "@/app/actions/habits"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hideHabits, setHideHabits] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchHabits()
    const savedHideHabits = localStorage.getItem('hideHabits')
    if (savedHideHabits) setHideHabits(savedHideHabits === 'true')
  }, [])

  const toggleHideHabits = () => {
    const next = !hideHabits
    setHideHabits(next)
    localStorage.setItem('hideHabits', String(next))
  }

  const fetchHabits = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setHabits(data)
    setLoading(false)
  }

  const handleSaveHabit = async (name: string, goal: string, interval: number) => {
    if (editingHabit) {
      const result = await updateHabit(editingHabit.id, {
        name,
        goal_description: goal,
        frequency_interval: interval
      })
      if (result.success) {
        setHabits(habits.map(h => h.id === editingHabit.id ? { ...h, name, goal_description: goal, frequency_interval: interval } : h))
      }
    } else {
      const result = await createHabit(name, goal, interval)
      if (result.success && result.habit) {
        setHabits([result.habit as Habit, ...habits])
      }
    }
    setEditingHabit(null)
  }

  const handleDeleteHabit = async (id: string) => {
    if (!confirm("Excluir este hábito? Todas as sequências serão perdidas.")) return
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) {
      setHabits(habits.filter(h => h.id !== id))
    }
  }

  const getFrequencyLabel = (interval: number) => {
    if (interval === 1) return "Diária"
    if (interval === 7) return "Semanal"
    return `A cada ${interval} dias`
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 text-indigo animate-spin" />
      <p className="text-muted animate-pulse">Carregando seus micro-hábitos...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Micro-Hábitos</h1>
            <button 
              onClick={toggleHideHabits} 
              className="mt-1 text-muted hover:text-foreground transition-colors"
              title={hideHabits ? "Mostrar hábitos" : "Ocultar hábitos"}
            >
              {hideHabits ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-muted">Mantenha a constância com metas ridiculamente pequenas.</p>
        </div>
        <Button onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Hábito
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => (
          <Card key={habit.id} className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface hover:shadow-lg dark:hover:shadow-indigo/20 transition-all group overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="bg-indigo/5 p-2 rounded-lg text-indigo group-hover:bg-indigo group-hover:text-white transition-colors">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-orange bg-orange/5 dark:bg-orange/10 px-2 py-1 rounded-lg text-xs font-bold ring-1 ring-orange/10 dark:ring-orange/20">
                  <Flame className="w-3 h-3 fill-current" />
                  {habit.streak_count} dias
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingHabit(habit); setIsModalOpen(true); }}
                    className="p-1.5 text-muted hover:text-indigo hover:bg-indigo/10 rounded-md transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className={cn("font-semibold dark:font-bold text-lg mb-1 group-hover:text-indigo transition-colors", hideHabits && "filter blur-[4px] select-none")}>
                {hideHabits ? "Hábito Oculto" : habit.name}
              </h3>
              <p className={cn("text-sm text-muted mb-4 line-clamp-2 min-h-[40px] font-medium", hideHabits && "filter blur-[3px] select-none")}>
                {hideHabits ? "Descrição do hábito confidencial." : habit.goal_description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                  Frequência: {getFrequencyLabel(habit.frequency_interval || 1)}
                </span>
                <span className="text-[10px] font-black text-indigo uppercase tracking-widest bg-indigo/5 dark:bg-indigo/10 px-2 py-0.5 rounded-full ring-1 ring-indigo/10 dark:ring-0">
                  Ativo
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {habits.length === 0 && (
          <div className="col-span-full text-center py-24 bg-surface rounded-3xl border-2 border-dashed border-border">
            <div className="bg-indigo/5 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Flame className="w-10 h-10 text-muted" />
            </div>
            <h3 className="font-bold text-xl text-foreground">Zero resistência cerebral</h3>
            <p className="text-muted mt-2 max-w-sm mx-auto font-medium">
              Crie seu primeiro micro-hábito. Lembre-se: o objetivo deve ser tão pequeno que seja impossível não fazer.
            </p>
            <Button className="mt-8" onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}>
              Começar Agora
            </Button>
          </div>
        )}
      </div>

      <CreateHabitModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingHabit(null); }} 
        onSave={handleSaveHabit}
        initialData={editingHabit ? {
          name: editingHabit.name,
          goal_description: editingHabit.goal_description,
          frequency_interval: editingHabit.frequency_interval || 1
        } : undefined}
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { 
  format, 
  addMonths, 
  subMonths, 
  addDays,
  subDays,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  parseISO
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2, Trash2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { CalendarEvent } from "@/types/database"
import { deleteEvent } from "@/app/actions/events"
import { CreateEventModal } from "@/components/CreateEventModal"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'day'>('month')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [customCategories, setCustomCategories] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('calendar_categories')
    if (saved) setCustomCategories(JSON.parse(saved))
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const fetchEvents = async () => {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()
    
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_time', start)
      .lte('end_time', end)

    if (data) setEvents(data)
    setLoading(false)
  }

  const handleNext = () => {
    if (view === 'day') {
      const nextDay = addDays(selectedDate, 1)
      setSelectedDate(nextDay)
      if (!isSameMonth(nextDay, currentDate)) {
        setCurrentDate(startOfMonth(nextDay))
      }
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const handlePrev = () => {
    if (view === 'day') {
      const prevDay = subDays(selectedDate, 1)
      setSelectedDate(prevDay)
      if (!isSameMonth(prevDay, currentDate)) {
        setCurrentDate(startOfMonth(prevDay))
      }
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento?")) return
    const result = await deleteEvent(id)
    if (result.success) {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const dayEvents = (day: Date) => events.filter(e => isSameDay(parseISO(e.start_time), day))

  const defaultCategories = {
    trabalho: "bg-indigo/10 text-indigo border-indigo/20",
    estudo: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    pessoal: "bg-green/10 text-green border-green/20"
  }
  
  const categories = { ...defaultCategories, ...customCategories }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-28 sm:pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-10 sm:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight capitalize">
            {view === 'day' 
              ? format(selectedDate, "d 'de' MMMM yyyy", { locale: ptBR })
              : format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="text-muted">Gerencie seu cronograma e compromissos.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface p-1 rounded-lg mr-2 shadow-sm">
            <button 
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'month' ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              Mês
            </button>
            <button 
              onClick={() => setView('day')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'day' ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              Dia
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={handlePrev}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => {
              const today = new Date()
              setSelectedDate(today)
              setCurrentDate(today)
            }}>Hoje</Button>
            <Button variant="secondary" size="sm" onClick={handleNext}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button size="sm" className="ml-2" onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>
      </header>

      {view === 'month' ? (
        <Card className="shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 border-b border-border bg-muted/5">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-black text-muted uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isSelected = isSameDay(day, selectedDate)
              const dayEvs = dayEvents(day)

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedDate(day)
                    setView('day')
                  }}
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-border transition-all cursor-pointer hover:bg-indigo/[0.02]",
                    !isCurrentMonth && "opacity-20",
                    isSelected && "bg-indigo/[0.03]"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-xs font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                      isToday(day) ? "bg-indigo text-white shadow-lg shadow-indigo/20" : "text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvs.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setIsModalOpen(true);
                        }}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border font-black truncate hover:opacity-80 transition-opacity uppercase tracking-tighter",
                          categories[event.category as keyof typeof categories] || categories.pessoal
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvs.length > 3 && (
                      <div className="text-[9px] text-muted font-black px-1.5 uppercase">
                        + {dayEvs.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo" />
                Cronograma de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <div className="relative space-y-0">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div key={hour} className="flex border-t border-border h-16 group relative">
                  <div className="w-16 -mt-3 pr-4 text-right text-[10px] font-black text-muted group-hover:text-foreground transition-colors">
                    {format(new Date().setHours(hour, 0), 'HH:mm')}
                  </div>
                  <div className="flex-1 relative">
                    {dayEvents(selectedDate).filter(e => {
                      const start = parseISO(e.start_time).getHours()
                      return start === hour
                    }).map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "absolute inset-x-2 top-1 rounded-xl border p-3 z-10 shadow-lg animate-in zoom-in-95 duration-200",
                          categories[event.category as keyof typeof categories]
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="cursor-pointer flex-1" onClick={() => { setEditingEvent(event); setIsModalOpen(true); }}>
                            <p className="font-black text-sm uppercase tracking-tight">{event.title}</p>
                            <p className="text-[10px] font-bold opacity-70">
                              {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingEvent(event); setIsModalOpen(true); }} className="p-1 hover:text-indigo transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
             <Card className="border-none shadow-soft dark:shadow-xl dark:shadow-indigo/5 bg-surface p-6">
               <h3 className="font-black text-[10px] uppercase tracking-widest text-muted mb-4">Legenda</h3>
               <div className="space-y-3">
                 {Object.entries(categories).map(([cat, style]) => (
                   <div key={cat} className="flex items-center gap-3">
                     <div className={cn("w-3 h-3 rounded-full border", style.split(' ')[0], style.split(' ')[2])} />
                     <span className="text-sm font-bold capitalize text-foreground">{cat}</span>
                   </div>
                 ))}
               </div>
             </Card>
          </div>
        </div>
      )}

      <CreateEventModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }} 
        onSave={fetchEvents}
        selectedDate={selectedDate}
        categories={categories}
        onAddCategory={(cat, color) => {
          const newCats = { ...customCategories, [cat]: color }
          setCustomCategories(newCats)
          localStorage.setItem('calendar_categories', JSON.stringify(newCats))
        }}
        initialData={editingEvent ? {
          id: editingEvent.id,
          title: editingEvent.title,
          start_time: editingEvent.start_time,
          end_time: editingEvent.end_time,
          category: editingEvent.category
        } : undefined}
      />
    </div>
  )
}

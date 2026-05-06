"use client"

import { useState, useEffect } from "react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  startOfDay,
  isToday,
  parseISO
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Clock, Tag, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
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
  const supabase = createClient()

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

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento?")) return
    const result = await deleteEvent(id)
    if (result.success) {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  // Monthly Grid Calculation
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const dayEvents = (day: Date) => events.filter(e => isSameDay(parseISO(e.start_time), day))

  const categories = {
    trabalho: "bg-indigo/10 text-indigo border-indigo/20",
    estudo: "bg-amber-50 text-amber-600 border-amber-100",
    pessoal: "bg-green/5 text-green border-green/20"
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="text-gray-500">Gerencie seu cronograma e compromissos.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button 
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'month' ? "bg-white shadow-sm text-indigo" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Mês
            </button>
            <button 
              onClick={() => setView('day')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'day' ? "bg-white shadow-sm text-indigo" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Dia
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            <Button variant="secondary" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button size="sm" className="ml-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>
      </header>

      {view === 'month' ? (
        <Card className="border-none shadow-xl shadow-indigo/5 ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
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
                    setView('day') // Added to show details of the day
                  }}
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-gray-50 transition-all cursor-pointer hover:bg-gray-50/50",
                    !isCurrentMonth && "bg-gray-50/30 text-gray-300",
                    isSelected && "ring-2 ring-inset ring-indigo/20 bg-indigo/[0.02]"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                      isToday(day) ? "bg-indigo text-white" : "text-gray-700"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvs.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-bold truncate",
                          categories[event.category as keyof typeof categories] || categories.pessoal
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvs.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-bold px-1.5">
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
          {/* Day Timeline */}
          <Card className="lg:col-span-2 border-none shadow-xl shadow-indigo/5 ring-1 ring-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo" />
                Cronograma de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <div className="relative space-y-0">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div key={hour} className="flex border-t border-gray-50 h-16 group relative">
                  <div className="w-16 -mt-3 pr-4 text-right text-[10px] font-bold text-gray-300 group-hover:text-gray-500 transition-colors">
                    {format(new Date().setHours(hour, 0), 'HH:mm')}
                  </div>
                  <div className="flex-1 relative">
                    {/* Events for this hour */}
                    {dayEvents(selectedDate).filter(e => {
                      const start = parseISO(e.start_time).getHours()
                      return start === hour
                    }).map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "absolute inset-x-2 top-1 rounded-lg border p-3 z-10 shadow-sm animate-in zoom-in-95 duration-200",
                          categories[event.category as keyof typeof categories]
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm">{event.title}</p>
                            <p className="text-[10px] opacity-70">
                              {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteEvent(event.id)} className="hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Mini Calendar & Filters */}
          <div className="space-y-6">
             <Card className="border-none shadow-xl shadow-indigo/5 ring-1 ring-gray-100 p-6">
               <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-4">Legenda</h3>
               <div className="space-y-3">
                 {Object.entries(categories).map(([cat, style]) => (
                   <div key={cat} className="flex items-center gap-3">
                     <div className={cn("w-3 h-3 rounded-full border", style.split(' ')[0], style.split(' ')[2])} />
                     <span className="text-sm font-medium capitalize text-gray-600">{cat}</span>
                   </div>
                 ))}
               </div>
             </Card>

             <section className="bg-indigo text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo/20">
               <div className="relative z-10">
                 <h3 className="font-bold text-lg mb-2">Dica de Gestão</h3>
                 <p className="text-indigo-100 text-sm leading-relaxed italic">
                   "Use blocos de tempo (Time Blocking) para focar em uma única categoria por vez."
                 </p>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-10">
                 <Clock className="w-32 h-32" />
               </div>
             </section>
          </div>
        </div>
      )}

      <CreateEventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchEvents}
        selectedDate={selectedDate}
      />
    </div>
  )
}


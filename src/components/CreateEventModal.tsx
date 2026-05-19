"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { X, Calendar } from "lucide-react"
import { createEvent, updateEvent } from "@/app/actions/events"
import { format, parseISO } from "date-fns"

export function CreateEventModal({ 
  isOpen, 
  onClose, 
  onSave,
  selectedDate,
  categories,
  onAddCategory,
  initialData
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void,
  selectedDate: Date,
  categories: Record<string, string>,
  onAddCategory: (cat: string, color: string) => void,
  initialData?: { id: string, title: string, start_time: string, end_time: string, category: string }
}) {
  const [title, setTitle] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [category, setCategory] = useState<string>('trabalho')
  const [loading, setLoading] = useState(false)
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("bg-blue-500/10 text-blue-500 border-blue-500/20")

  const PRESET_COLORS = [
    { name: "Azul", class: "bg-blue-500/10 text-blue-500 border-blue-500/20", dot: "bg-blue-500" },
    { name: "Rosa", class: "bg-pink-500/10 text-pink-500 border-pink-500/20", dot: "bg-pink-500" },
    { name: "Verde Claro", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", dot: "bg-emerald-500" },
    { name: "Laranja", class: "bg-orange-500/10 text-orange-500 border-orange-500/20", dot: "bg-orange-500" },
    { name: "Roxo", class: "bg-purple-500/10 text-purple-500 border-purple-500/20", dot: "bg-purple-500" },
    { name: "Vermelho", class: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500" }
  ]

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setStartTime(format(parseISO(initialData.start_time), "HH:mm"))
      setEndTime(format(parseISO(initialData.end_time), "HH:mm"))
      setCategory(initialData.category as any)
    } else {
      setTitle("")
      setStartTime("09:00")
      setEndTime("10:00")
      setCategory("trabalho")
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const start = new Date(selectedDate)
    const [startH, startM] = startTime.split(':')
    start.setHours(parseInt(startH), parseInt(startM))

    const end = new Date(selectedDate)
    const [endH, endM] = endTime.split(':')
    end.setHours(parseInt(endH), parseInt(endM))

    let result
    if (initialData) {
      result = await updateEvent(initialData.id, {
        title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        category
      })
    } else {
      result = await createEvent(title, start.toISOString(), end.toISOString(), category)
    }
    
    setLoading(false)
    if (result.success) {
      setTitle("")
      onSave()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl border-none bg-surface">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 font-bold text-foreground">
            <Calendar className="w-5 h-5 text-indigo" />
            {initialData ? "Editar Compromisso" : "Novo Compromisso"}
          </CardTitle>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted">Título</label>
              <Input 
                placeholder="Ex: Reunião de Planejamento" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Início</label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Fim</label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted flex justify-between items-center">
                Categoria
                {!isAddingCategory && (
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="text-indigo hover:underline capitalize text-[10px]">
                    + Nova Categoria
                  </button>
                )}
              </label>
              
              {isAddingCategory ? (
                <div className="p-3 border border-border rounded-lg bg-muted/5 space-y-3">
                  <Input 
                    placeholder="Nome da categoria (ex: Faculdade)" 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.class}
                        type="button"
                        onClick={() => setNewCatColor(c.class)}
                        className={`w-6 h-6 rounded-full transition-all ${c.dot} ${newCatColor === c.class ? "ring-2 ring-indigo ring-offset-2" : ""}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAddingCategory(false)}>Cancelar</Button>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                      if (!newCatName.trim()) return
                      onAddCategory(newCatName.toLowerCase(), newCatColor)
                      setCategory(newCatName.toLowerCase())
                      setIsAddingCategory(false)
                      setNewCatName("")
                    }}>
                      Salvar Categoria
                    </Button>
                  </div>
                </div>
              ) : (
                <select 
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo/20 transition-all cursor-pointer capitalize"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {Object.keys(categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t border-border pt-6">
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : (initialData ? "Salvar Alterações" : "Agendar Evento")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

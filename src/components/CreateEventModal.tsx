"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { X, Calendar } from "lucide-react"
import { createEvent } from "@/app/actions/events"

export function CreateEventModal({ 
  isOpen, 
  onClose, 
  onSave,
  selectedDate
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: () => void,
  selectedDate: Date
}) {
  const [title, setTitle] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [category, setCategory] = useState<'trabalho' | 'estudo' | 'pessoal'>('trabalho')
  const [loading, setLoading] = useState(false)

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

    const result = await createEvent(title, start.toISOString(), end.toISOString(), category)
    
    setLoading(false)
    if (result.success) {
      setTitle("")
      onSave()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo" />
            Novo Compromisso
          </CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Título</label>
              <Input 
                placeholder="Ex: Reunião de Planejamento" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Início</label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Fim</label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Categoria</label>
              <select 
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
              >
                <option value="trabalho">Trabalho</option>
                <option value="estudo">Estudo</option>
                <option value="pessoal">Pessoal</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Agendando..." : "Agendar Evento"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

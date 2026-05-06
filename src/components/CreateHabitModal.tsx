"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { X, Flame } from "lucide-react"

export function CreateHabitModal({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (name: string, goal: string, interval: number) => void 
}) {
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [interval, setIntervalValue] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSave(name, goal, interval)
    setLoading(false)
    setName("")
    setGoal("")
    setIntervalValue(1)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo" />
            Novo Micro-Hábito
          </CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">O que você vai fazer?</label>
              <Input 
                placeholder="Ex: Ler 1 página" 
                value={name} 
                onChange={e => setName(e.target.value)}
                required
              />
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Dica: Escolha algo ridiculamente fácil.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Frequência</label>
                <select 
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo/20"
                  value={interval}
                  onChange={e => setIntervalValue(parseInt(e.target.value))}
                >
                  <option value={1}>Todo dia</option>
                  <option value={2}>A cada 2 dias</option>
                  <option value={3}>A cada 3 dias</option>
                  <option value={7}>Uma vez por semana</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Propósito</label>
                <Input 
                  placeholder="Ex: Criar hábito" 
                  value={goal} 
                  onChange={e => setGoal(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar Hábito"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

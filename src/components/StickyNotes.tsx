"use client"

import { useState, useEffect } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { Note } from "@/types/database"

const COLORS = [
  "bg-yellow-200 text-yellow-900 border-yellow-300",
  "bg-pink-200 text-pink-900 border-pink-300",
  "bg-blue-200 text-blue-900 border-blue-300",
  "bg-green-200 text-green-900 border-green-300",
]

export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setNotes(data)
    setLoading(false)
  }

  const addNote = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newNote = {
      user_id: user.id,
      content: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }

    const { data, error } = await supabase
      .from('notes')
      .insert(newNote)
      .select()
      .single()

    if (!error && data) {
      setNotes([data, ...notes])
    }
  }

  const updateNote = async (id: string, content: string) => {
    // Update local state for immediate feedback
    setNotes(notes.map(n => n.id === id ? { ...n, content } : n))

    // Update database
    await supabase
      .from('notes')
      .update({ content })
      .eq('id', id)
  }

  const updateNoteColor = async (id: string, color: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, color } : n))
    await supabase
      .from('notes')
      .update({ color })
      .eq('id', id)
  }

  const deleteNote = async (id: string) => {
    setNotes(notes.filter(n => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-indigo animate-spin" />
    </div>
  )

  return (
    <section className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mural de Lembretes</h2>
          <p className="text-muted text-sm mt-1">Suas notas colantes para não esquecer de nada.</p>
        </div>
        <button 
          onClick={addNote}
          className="bg-surface border border-border p-2 rounded-xl text-foreground hover:bg-muted/5 transition-colors shadow-sm ring-1 ring-border"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {notes.map((note) => (
          <div 
            key={note.id} 
            className={cn(
              "relative p-4 rounded-bl-3xl rounded-tr-sm shadow-md transition-all hover:shadow-lg focus-within:shadow-lg focus-within:-translate-y-1 group border-b-4 border-r-2",
              note.color
            )}
          >
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => updateNoteColor(note.id, c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/10 transition-transform hover:scale-110", 
                    c.split(' ')[0],
                    note.color === c && "ring-2 ring-indigo ring-offset-1"
                  )}
                  title="Trocar cor"
                />
              ))}
            </div>
            <button 
              onClick={() => deleteNote(note.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-600 hover:scale-110"
            >
              <X className="w-3 h-3" />
            </button>
            <textarea
              value={note.content}
              onChange={(e) => updateNote(note.id, e.target.value)}
              placeholder="Escreva algo..."
              className="w-full h-32 bg-transparent border-none outline-none resize-none placeholder:text-current placeholder:opacity-50 font-medium text-sm custom-scrollbar !text-current pt-4"
              style={{ lineHeight: "1.6" }}
            />
          </div>
        ))}
        {notes.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl bg-surface">
            <p className="text-muted font-medium">Nenhum lembrete no momento.</p>
            <button onClick={addNote} className="text-indigo font-bold text-sm mt-2 hover:underline">
              Criar meu primeiro post-it
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

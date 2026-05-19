import { createClient } from "@/utils/supabase/client"

export async function createEvent(title: string, startTime: string, endTime: string, category: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Usuário não autenticado" }

  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      start_time: startTime,
      end_time: endTime,
      category,
      user_id: user.id
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  return { success: true, event: data }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  return { success: true }
}

export async function getEvents(start: string, end: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', start)
    .lte('end_time', end)

  if (error) return []
  return data
}

export async function updateEvent(id: string, updates: { title?: string, start_time?: string, end_time?: string, category?: string }) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

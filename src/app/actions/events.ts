"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createEvent(title: string, startTime: string, endTime: string, category: 'trabalho' | 'estudo' | 'pessoal') {
  const supabase = await createClient()
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
  
  revalidatePath('/calendar')
  return { success: true, event: data }
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/calendar')
  return { success: true }
}

export async function getEvents(start: string, end: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', start)
    .lte('end_time', end)

  if (error) return []
  return data
}

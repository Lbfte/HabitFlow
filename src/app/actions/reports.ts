"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createReport(title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Usuário não autenticado" }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      title,
      content: "",
      user_id: user.id,
      is_public: false
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/reports')
  return { success: true, report: data }
}

export async function updateReport(id: string, updates: { title?: string, content?: string, is_public?: boolean }) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath(`/reports/${id}`)
  revalidatePath('/reports')
  return { success: true }
}

export async function deleteReport(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/reports')
  return { success: true }
}

export async function getReport(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getPublicReport(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select('*, user:user_id(id)') // In a real app, you might want user profile info
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error) return null
  return data
}

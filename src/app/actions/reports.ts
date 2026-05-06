import { createClient } from "@/utils/supabase/client"

export async function createReport(title: string) {
  const supabase = createClient()
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
  
  return { success: true, report: data }
}

export async function updateReport(id: string, updates: { title?: string, content?: string, is_public?: boolean, access_code?: string | null }) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }
  
  return { success: true }
}

export async function deleteReport(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  return { success: true }
}

export async function getReport(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getPublicReport(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select('*, user:user_id(id)')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error) return null
  return data
}

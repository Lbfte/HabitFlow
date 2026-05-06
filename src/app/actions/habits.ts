"use server"

import { createClient } from "@/utils/supabase/server"
import { differenceInDays, parseISO, isToday } from "date-fns"

export async function completeHabit(habitId: string) {
  const supabase = await createClient()
  
  const { data: habit, error: fetchError } = await supabase
    .from('habits')
    .select('streak_count, last_completed_at, frequency_interval')
    .eq('id', habitId)
    .single()

  if (fetchError || !habit) {
    return { error: "Hábito não encontrado" }
  }

  const lastCompleted = habit.last_completed_at ? parseISO(habit.last_completed_at) : null
  const interval = habit.frequency_interval || 1
  let newStreak = habit.streak_count

  if (lastCompleted && isToday(lastCompleted)) {
    return { success: true, message: "Já concluído hoje" }
  }

  if (!lastCompleted) {
    newStreak = 1
  } else {
    const diff = differenceInDays(new Date(), lastCompleted)
    
    // Se a diferença for menor ou igual ao intervalo esperado, a sequência continua
    if (diff <= interval) {
      newStreak += 1
    } else {
      // Se passou do intervalo (ex: era pra fzr a cada 2 dias, mas fez dps de 3), reseta
      newStreak = 1
    }
  }

  const { error: updateError } = await supabase
    .from('habits')
    .update({
      streak_count: newStreak,
      last_completed_at: new Date().toISOString()
    })
    .eq('id', habitId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true, newStreak }
}

export async function createHabit(name: string, goalDescription: string, frequencyInterval: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Usuário não autenticado" }

  const { data, error } = await supabase
    .from('habits')
    .insert({
      name,
      goal_description: goalDescription,
      user_id: user.id,
      streak_count: 0,
      frequency_interval: frequencyInterval
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { success: true, habit: data }
}

export async function getHabits() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

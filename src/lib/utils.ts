import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseTaskTitle(title: string) {
  if (!title) return { time: null, category: null, cleanTitle: "" }
  
  let time: string | null = null
  let category: string | null = null
  let remaining = title.trim()

  // 1. Tenta extrair o horário no início: [HH:MM]
  const timeMatch = remaining.match(/^\[(\d{2}:\d{2})\]\s*(.*)$/)
  if (timeMatch) {
    time = timeMatch[1]
    remaining = timeMatch[2].trim()
  }

  // 2. Tenta extrair a categoria: [cat:Nome]
  const catMatch = remaining.match(/^\[cat:([^\]]+)\]\s*(.*)$/)
  if (catMatch) {
    category = catMatch[1]
    remaining = catMatch[2].trim()
  }

  return {
    time,
    category,
    cleanTitle: remaining
  }
}

export function formatTaskTitle(title: string, time: string | null, category: string | null = null) {
  let result = ""
  if (time && time.trim()) {
    result += `[${time.trim()}] `
  }
  if (category && category.trim()) {
    result += `[cat:${category.trim()}] `
  }
  result += title.trim()
  return result.trim()
}

export function sortTasks<T extends { title: string; is_completed: boolean; created_at?: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // 1. Completion status
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1
    }
    
    // Parse times
    const aParsed = parseTaskTitle(a.title)
    const bParsed = parseTaskTitle(b.title)

    // 2. Both have times -> sort chronologically
    if (aParsed.time && bParsed.time) {
      return aParsed.time.localeCompare(bParsed.time)
    }

    // 3. One has time -> tasks with time come first
    if (aParsed.time) return -1
    if (bParsed.time) return 1

    // 4. Neither has time -> sort by created_at descending if available
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return 0
  })
}


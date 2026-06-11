import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseTaskTitle(title: string) {
  if (!title) return { time: null, cleanTitle: "" }
  const match = title.match(/^\[(\d{2}:\d{2})\]\s*(.*)$/)
  if (match) {
    return {
      time: match[1],
      cleanTitle: match[2].trim()
    }
  }
  return {
    time: null,
    cleanTitle: title.trim()
  }
}

export function formatTaskTitle(title: string, time: string | null) {
  if (!time || !time.trim()) return title.trim()
  return `[${time}] ${title.trim()}`
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


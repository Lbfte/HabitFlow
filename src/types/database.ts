export type Habit = {
  id: string
  user_id: string
  name: string
  goal_description: string | null
  frequency_type: 'daily' | 'weekly'
  streak_count: number
  last_completed_at: string | null
  frequency_interval: number | null
  created_at: string
}

export type DailyTask = {
  id: string
  user_id: string
  title: string
  is_completed: boolean
  due_date: string
  priority: 1 | 2 | 3
  created_at: string
}

export type Report = {
  id: string
  user_id: string
  title: string | null
  content: string | null
  is_public: boolean
  access_code: string | null
  created_at: string
}

export type CalendarEvent = {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  category: string
  created_at: string
}

export type Note = {
  id: string
  user_id: string
  content: string
  color: string
  created_at: string
}

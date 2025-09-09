export type TaskVM = {
  id: string
  title: string
  date?: string
  time?: string
  status: 'todo' | 'completed' | 'archived'
  priority?: 'low' | 'medium' | 'high'
}

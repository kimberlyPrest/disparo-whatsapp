import { supabase } from '@/lib/supabase/client'

export interface Campaign {
  id: string
  user_id: string
  name: string
  status: 'scheduled' | 'active' | 'finished'
  total_messages: number
  messages_sent: number
  execution_time: number
  scheduled_for: string | null
  created_at: string
}

export const campaignsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Campaign[]
  },
}

import { supabase } from '@/lib/supabase/client'

export interface Campaign {
  id: string
  user_id: string
  name: string
  status: 'scheduled' | 'active' | 'finished'
  total_messages: number
  sent_messages: number
  execution_time: number
  scheduled_at: string | null
  started_at: string | null
  finished_at: string | null
  config: Record<string, any> | null
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

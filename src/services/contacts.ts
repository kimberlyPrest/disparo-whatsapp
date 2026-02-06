import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

export type Contact = Database['public']['Tables']['contacts']['Row']

export const contactsService = {
  async getByIds(ids: string[]) {
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .in('id', ids)

    if (error) throw error
    return data as Contact[]
  },
}

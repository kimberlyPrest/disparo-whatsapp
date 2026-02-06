import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

export interface Campaign {
  id: string
  user_id: string
  name: string
  status:
    | 'scheduled'
    | 'active'
    | 'finished'
    | 'pending'
    | 'processing'
    | 'paused'
    | 'failed'
    | 'canceled'
  total_messages: number
  sent_messages: number
  execution_time: number
  scheduled_at: string | null
  started_at: string | null
  finished_at: string | null
  config: Record<string, any> | null
  created_at: string
}

export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']

export const campaignsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Campaign[]
  },

  async create(campaign: CampaignInsert, contactIds: string[]) {
    // 1. Create the campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single()

    if (campaignError) throw campaignError

    if (contactIds.length === 0) return campaignData as Campaign

    // 2. Create campaign messages for each contact
    // Process in chunks to avoid request size limits if many contacts
    const chunkSize = 100
    const messages = contactIds.map((contactId) => ({
      campaign_id: campaignData.id,
      contact_id: contactId,
      status: 'aguardando',
    }))

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize)
      const { error: messagesError } = await supabase
        .from('campaign_messages')
        .insert(chunk)

      if (messagesError) {
        console.error('Error creating campaign messages chunk', messagesError)
        throw messagesError
      }
    }

    return campaignData as Campaign
  },
}

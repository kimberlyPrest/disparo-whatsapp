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

export interface CampaignMessage {
  id: string
  campaign_id: string
  contact_id: string
  status: string
  error_message: string | null
  sent_at: string | null
  contacts: {
    name: string
    phone: string
  } | null
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

  async getById(id: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Campaign
  },

  async create(campaign: CampaignInsert, contactIds: string[]) {
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single()

    if (campaignError) throw campaignError

    if (contactIds.length === 0) return campaignData as Campaign

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

  async pause(id: string) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', id)

    if (error) throw error
  },

  async resume(id: string) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', id)

    if (error) throw error
  },

  async getMessages(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_messages')
      .select('*, contacts(name, phone)')
      .eq('campaign_id', campaignId)
      .order('id', { ascending: true })

    if (error) throw error
    return data as unknown as CampaignMessage[]
  },

  async retryMessage(messageId: string) {
    const { error } = await supabase
      .from('campaign_messages')
      .update({
        status: 'aguardando',
        error_message: null,
        sent_at: null,
      })
      .eq('id', messageId)

    if (error) throw error
  },
}

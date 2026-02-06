import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Initialize Supabase Client with Service Role Key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface CampaignConfig {
  minInterval: number
  maxInterval: number
  useBatching: boolean
  batchSize?: number
  batchPauseMin?: number
  batchPauseMax?: number
  businessHoursStrategy: 'ignore' | 'pause'
  businessHoursPauseTime?: string
  businessHoursResumeTime?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    const MAX_EXECUTION_TIME = 55000 // 55 seconds to be safe within 60s cron

    // 1. Fetch active or scheduled campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['scheduled', 'pending', 'processing', 'active'])
      .lte('scheduled_at', new Date().toISOString())

    if (campaignsError) throw campaignsError

    console.log(`Processing ${campaigns.length} campaigns`)

    const results = []

    for (const campaign of campaigns) {
      // Check execution time limit
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break

      const campaignResult = {
        id: campaign.id,
        messagesSent: 0,
        status: 'continued',
      }

      // Update status to processing if just starting
      if (campaign.status === 'scheduled' || campaign.status === 'pending') {
        await supabase
          .from('campaigns')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', campaign.id)

        campaign.status = 'processing' // Update local state
      }

      const config = campaign.config as unknown as CampaignConfig

      // Check Business Hours (Brazil Time: UTC-3)
      if (config?.businessHoursStrategy === 'pause') {
        const now = new Date()
        // Convert to BRT rough approximation or use explicit offset
        const utcHours = now.getUTCHours()
        const brtHours = (utcHours - 3 + 24) % 24

        const pauseHour = config.businessHoursPauseTime
          ? parseInt(config.businessHoursPauseTime.split(':')[0])
          : 18
        const resumeHour = config.businessHoursResumeTime
          ? parseInt(config.businessHoursResumeTime.split(':')[0])
          : 8

        // Simple check: if outside 08:00 - 18:00 (default)
        // Adjust logic to handle spanning midnight if needed, but assuming standard day hours
        const isBusinessHours = brtHours >= resumeHour && brtHours < pauseHour

        if (!isBusinessHours) {
          console.log(
            `Campaign ${campaign.id} paused due to business hours (Current BRT: ${brtHours})`,
          )
          results.push({ ...campaignResult, status: 'paused_business_hours' })
          continue
        }
      }

      // Check for completion
      const { count: pendingCount } = await supabase
        .from('campaign_messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'aguardando')

      if (pendingCount === 0) {
        // Double check if any are 'sending' (could be stuck, but ignoring for now)
        // Mark campaign as finished
        await supabase
          .from('campaigns')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
            execution_time: Math.floor(
              (Date.now() - new Date(campaign.created_at).getTime()) / 1000,
            ), // Rough total time
          })
          .eq('id', campaign.id)

        results.push({ ...campaignResult, status: 'finished' })
        continue
      }

      // Process Messages loop
      let campaignLoopActive = true
      while (
        campaignLoopActive &&
        Date.now() - startTime < MAX_EXECUTION_TIME
      ) {
        // Fetch last sent message to determine delays
        const { data: lastMessages } = await supabase
          .from('campaign_messages')
          .select('sent_at')
          .eq('campaign_id', campaign.id)
          .neq('sent_at', null)
          .order('sent_at', { ascending: false })
          .limit(1)

        const lastSentAt = lastMessages?.[0]?.sent_at
          ? new Date(lastMessages[0].sent_at).getTime()
          : 0
        const sentMessagesCount = campaign.sent_messages || 0 // Approximate, should use count from DB ideally

        // Calculate Delay
        let requiredDelay = 0
        const minInterval = (config?.minInterval || 10) * 1000
        const maxInterval = (config?.maxInterval || 30) * 1000

        // Random interval
        const intervalDelay = Math.floor(
          Math.random() * (maxInterval - minInterval + 1) + minInterval,
        )
        requiredDelay = intervalDelay

        // Batch Pause Logic
        if (
          config?.useBatching &&
          config.batchSize &&
          sentMessagesCount > 0 &&
          sentMessagesCount % config.batchSize === 0
        ) {
          // We are at a batch boundary. Check if we just finished it.
          // If the last message was sent recently, we must wait the batch pause.
          const batchPauseMin = (config.batchPauseMin || 60) * 1000
          const batchPauseMax = (config.batchPauseMax || 120) * 1000
          const batchPause = Math.floor(
            Math.random() * (batchPauseMax - batchPauseMin + 1) + batchPauseMin,
          )
          requiredDelay = batchPause
        }

        const timeSinceLast = Date.now() - lastSentAt

        if (timeSinceLast < requiredDelay) {
          // We need to wait
          const waitTime = requiredDelay - timeSinceLast
          if (Date.now() + waitTime > startTime + MAX_EXECUTION_TIME) {
            // Cannot wait in this execution
            campaignLoopActive = false
            break
          }
          // Wait
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        // Fetch ONE message to send (Locking strategy: Optimistic update)
        // Find a message that is 'aguardando'
        const { data: messageToLock } = await supabase
          .from('campaign_messages')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'aguardando')
          .limit(1)
          .maybeSingle()

        if (!messageToLock) {
          campaignLoopActive = false
          break
        }

        // Lock it
        const { data: lockedMessage, error: lockError } = await supabase
          .from('campaign_messages')
          .update({ status: 'sending', sent_at: new Date().toISOString() }) // Temporarily mark sending
          .eq('id', messageToLock.id)
          .eq('status', 'aguardando') // Ensure it wasn't taken
          .select('*, contacts(name, phone, message)')
          .single()

        if (lockError || !lockedMessage) {
          // Failed to lock, maybe another worker took it. Continue loop.
          continue
        }

        // Send Message
        try {
          const contact = lockedMessage.contacts
          if (!contact) throw new Error('Contact not found')

          // Call send-whatsapp-message function
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/send-whatsapp-message`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // No auth needed as per context, or use anon key if needed
              },
              body: JSON.stringify({
                name: contact.name,
                phone: contact.phone,
                message: contact.message,
              }),
            },
          )

          const result = await response.json()

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to send')
          }

          // Success
          await supabase
            .from('campaign_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', lockedMessage.id)

          // Update Campaign Stats
          await supabase.rpc('increment_campaign_sent', { row_id: campaign.id })

          // Increment local counter for batch logic in next iteration
          campaign.sent_messages = (campaign.sent_messages || 0) + 1
          campaignResult.messagesSent++
        } catch (err: any) {
          console.error(`Failed to send message ${lockedMessage.id}:`, err)
          await supabase
            .from('campaign_messages')
            .update({
              status: 'failed',
              error_message: err.message || 'Unknown error',
            })
            .eq('id', lockedMessage.id)
        }
      }

      results.push(campaignResult)
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  } catch (error) {
    console.error('Process error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )
  }
})

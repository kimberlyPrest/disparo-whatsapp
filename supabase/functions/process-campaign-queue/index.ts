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

    // Safely parse body
    let body: any = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch {
      // Body might be empty or invalid JSON, ignore
    }
    const { campaign_id } = body

    // 1. Fetch active or scheduled campaigns (Explicitly excluding paused)
    let query = supabase
      .from('campaigns')
      .select('*')
      .in('status', ['scheduled', 'pending', 'processing', 'active'])

    // If campaign_id is provided (manual trigger), filter by it
    if (campaign_id) {
      query = query.eq('id', campaign_id)
    } else {
      // Otherwise use schedule time logic
      query = query.lte('scheduled_at', new Date().toISOString())
    }

    const { data: campaigns, error: campaignsError } = await query

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
        const nowIso = new Date().toISOString()
        await supabase
          .from('campaigns')
          .update({ status: 'processing', started_at: nowIso })
          .eq('id', campaign.id)

        campaign.status = 'processing'
        campaign.started_at = nowIso // Update local state for accurate calculation
      }

      const config = campaign.config as unknown as CampaignConfig

      // Check Business Hours (Brazil Time: UTC-3)
      if (config?.businessHoursStrategy === 'pause') {
        const now = new Date()
        const utcHours = now.getUTCHours()
        const brtHours = (utcHours - 3 + 24) % 24

        const pauseHour = config.businessHoursPauseTime
          ? parseInt(config.businessHoursPauseTime.split(':')[0])
          : 18
        const resumeHour = config.businessHoursResumeTime
          ? parseInt(config.businessHoursResumeTime.split(':')[0])
          : 8

        const isBusinessHours = brtHours >= resumeHour && brtHours < pauseHour

        if (!isBusinessHours) {
          console.log(
            `Campaign ${campaign.id} paused due to business hours (Current BRT: ${brtHours})`,
          )
          results.push({ ...campaignResult, status: 'paused_business_hours' })
          continue
        }
      }

      // Helper to finalize campaign
      const finalizeCampaign = async () => {
        const now = new Date()
        const startedAt = campaign.started_at
          ? new Date(campaign.started_at)
          : new Date(campaign.created_at)
        // Ensure we calculate from started_at to now
        const executionTime = Math.max(
          0,
          Math.floor((now.getTime() - startedAt.getTime()) / 1000),
        )

        await supabase
          .from('campaigns')
          .update({
            status: 'finished',
            finished_at: now.toISOString(),
            execution_time: executionTime,
          })
          .eq('id', campaign.id)

        campaignResult.status = 'finished'
      }

      // Check for completion (Initial Check)
      // We perform this check at the beginning to handle cases where it finished right after previous run or if empty.
      const { count: pendingCount } = await supabase
        .from('campaign_messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'aguardando')

      if (pendingCount === 0) {
        // Ensure there are no active messages being processed/sent
        const { count: activeCount } = await supabase
          .from('campaign_messages')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .in('status', ['sending'])

        if (activeCount === 0) {
          await finalizeCampaign()
          results.push(campaignResult)
          continue
        }
      }

      // Process Messages loop
      let campaignLoopActive = true
      while (
        campaignLoopActive &&
        Date.now() - startTime < MAX_EXECUTION_TIME
      ) {
        // 1. CRITICAL: Check if campaign status changed to PAUSED during execution
        // This ensures immediate pause response
        const { data: currentStatus } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single()

        if (
          currentStatus?.status === 'paused' ||
          currentStatus?.status === 'canceled'
        ) {
          console.log(
            `Campaign ${campaign.id} was paused/canceled during execution`,
          )
          campaignLoopActive = false
          break
        }

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
        const sentMessagesCount = campaign.sent_messages || 0
        const hasMessagesSentReally = lastMessages && lastMessages.length > 0

        // Calculate Delay
        let requiredDelay = 0
        const minInterval = (config?.minInterval || 10) * 1000
        const maxInterval = (config?.maxInterval || 30) * 1000

        const intervalDelay = Math.floor(
          Math.random() * (maxInterval - minInterval + 1) + minInterval,
        )
        requiredDelay = intervalDelay

        // Batch Pause Logic
        // We add the batch pause to the delay if this is a "batch break" message
        if (
          config?.useBatching &&
          config.batchSize &&
          sentMessagesCount > 0 &&
          sentMessagesCount % config.batchSize === 0
        ) {
          const batchPauseMin = (config.batchPauseMin || 60) * 1000
          const batchPauseMax = (config.batchPauseMax || 120) * 1000
          const batchPause = Math.floor(
            Math.random() * (batchPauseMax - batchPauseMin + 1) + batchPauseMin,
          )
          requiredDelay += batchPause
        }

        // CRITICAL: First message must be sent immediately (0 delay)
        // If we haven't sent any messages yet (checked via DB query to be safe), force 0 delay.
        if (!hasMessagesSentReally) {
          requiredDelay = 0
        }

        const timeSinceLast = Date.now() - lastSentAt

        if (timeSinceLast < requiredDelay) {
          const waitTime = requiredDelay - timeSinceLast
          // If the wait time is too long for this execution window, break and wait for next cron
          if (Date.now() + waitTime > startTime + MAX_EXECUTION_TIME) {
            campaignLoopActive = false
            break
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        // Fetch ONE message to send (Locking strategy: Optimistic update)
        const { data: messageToLock } = await supabase
          .from('campaign_messages')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'aguardando')
          .limit(1)
          .maybeSingle()

        if (!messageToLock) {
          // No more messages in 'aguardando'.
          // Verify if there are any remaining messages in transient states (double check)
          const { count: remaining } = await supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['aguardando', 'sending', 'pending'])

          if (remaining === 0) {
            // If confirmed empty, finalize immediately
            await finalizeCampaign()
          }

          campaignLoopActive = false
          break
        }

        // Lock it
        const { data: lockedMessage, error: lockError } = await supabase
          .from('campaign_messages')
          .update({ status: 'sending', sent_at: new Date().toISOString() })
          .eq('id', messageToLock.id)
          .eq('status', 'aguardando')
          .select('*, contacts(name, phone, message)')
          .single()

        if (lockError || !lockedMessage) {
          continue
        }

        // Send Message
        try {
          const contact = lockedMessage.contacts
          if (!contact) throw new Error('Contact not found')

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/send-whatsapp-message`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
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

          await supabase.rpc('increment_campaign_sent', { row_id: campaign.id })

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
    // Return 200 OK with success: false to prevent frontend invoke() from throwing
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )
  }
})

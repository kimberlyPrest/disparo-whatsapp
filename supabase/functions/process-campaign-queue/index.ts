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
  automaticPause?: {
    enabled: boolean
    pause_at: string
    resume_date: string
    resume_time: string
  }
}

function getSafeNumber(val: any, defaultVal: number): number {
  const n = parseInt(String(val), 10)
  return isNaN(n) ? defaultVal : n
}

function parseConfig(config: any): CampaignConfig {
  // Handle both snake_case (DB default) and camelCase (Frontend form)
  // Safely extract nested properties

  const autoPauseEnabled =
    config?.automaticPause?.enabled ?? config?.automatic_pause?.enabled ?? false
  const autoPauseAt =
    config?.automaticPause?.pauseTime ??
    config?.automatic_pause?.pause_at ??
    config?.automaticPause?.pause_at
  const autoResumeDate =
    config?.automaticPause?.resumeDate ?? config?.automatic_pause?.resume_date
  const autoResumeTime =
    config?.automaticPause?.resumeTime ?? config?.automatic_pause?.resume_time

  return {
    minInterval: getSafeNumber(config?.minInterval ?? config?.min_interval, 30),
    maxInterval: getSafeNumber(config?.maxInterval ?? config?.max_interval, 40),
    useBatching: Boolean(
      config?.useBatching ?? config?.batch_config?.enabled ?? false,
    ),
    batchSize: getSafeNumber(
      config?.batchSize ?? config?.batch_config?.size,
      20,
    ),
    batchPauseMin: getSafeNumber(
      config?.batchPauseMin ?? config?.batch_config?.pause_min,
      60,
    ),
    batchPauseMax: getSafeNumber(
      config?.batchPauseMax ?? config?.batch_config?.pause_max,
      120,
    ),
    businessHoursStrategy:
      config?.businessHoursStrategy ??
      config?.business_hours?.strategy ??
      'ignore',
    businessHoursPauseTime:
      config?.businessHoursPauseTime ?? config?.business_hours?.pause_at,
    businessHoursResumeTime:
      config?.businessHoursResumeTime ?? config?.business_hours?.resume_at,
    automaticPause: {
      enabled: Boolean(autoPauseEnabled),
      pause_at: String(autoPauseAt || ''),
      resume_date: String(autoResumeDate || ''),
      resume_time: String(autoResumeTime || ''),
    },
  }
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
      // Check execution time limit before starting campaign processing
      if (Date.now() - startTime > MAX_EXECUTION_TIME) break

      const campaignResult = {
        id: campaign.id,
        messagesSent: 0,
        status: 'continued',
      }

      // Update status to processing if just starting
      if (
        campaign.status === 'scheduled' ||
        campaign.status === 'pending' ||
        campaign.status === 'active'
      ) {
        const nowIso = new Date().toISOString()
        const updateData: any = { status: 'processing' }

        // Only set started_at if it wasn't set before
        if (!campaign.started_at) {
          updateData.started_at = nowIso
          campaign.started_at = nowIso
        }

        await supabase
          .from('campaigns')
          .update(updateData)
          .eq('id', campaign.id)

        campaign.status = 'processing'
      }

      const config = parseConfig(campaign.config)

      // -- PAUSE CHECK LOGIC --
      let shouldPause = false
      let pauseReason = ''

      const now = new Date()
      const utcHours = now.getUTCHours()
      // Brazil Time: UTC-3
      const brtHours = (utcHours - 3 + 24) % 24

      // 1. Automatic Scheduled Pause
      if (
        config.automaticPause?.enabled &&
        config.automaticPause.pause_at &&
        config.automaticPause.resume_date &&
        config.automaticPause.resume_time
      ) {
        try {
          const resumeDateStr = config.automaticPause.resume_date // ISO string
          const [resumeH, resumeM] = config.automaticPause.resume_time
            .split(':')
            .map(Number)

          const resumeDateTime = new Date(resumeDateStr)
          resumeDateTime.setHours(resumeH, resumeM, 0, 0)

          // Only check pause if we are BEFORE the resume time
          if (now < resumeDateTime) {
            const [pauseH, pauseM] = config.automaticPause.pause_at
              .split(':')
              .map(Number)

            // Check if we hit the pause time today (BRT)
            const nowMinutes = brtHours * 60 + now.getUTCMinutes()
            const pauseMinutes = pauseH * 60 + pauseM

            // Check if we are past the start date
            const startDateTime = new Date(
              campaign.started_at || campaign.created_at,
            )

            const todayStr = now.toISOString().split('T')[0]
            const startStr = startDateTime.toISOString().split('T')[0]

            const isAfterStartDay = todayStr > startStr
            const isPastPauseTime = nowMinutes >= pauseMinutes

            if (isPastPauseTime || isAfterStartDay) {
              shouldPause = true
              pauseReason = `Automatic Pause until ${resumeDateTime.toISOString()}`
            }
          }
        } catch (e) {
          console.error('Error parsing automatic pause config', e)
        }
      }

      // 2. Business Hours Check (Recurring)
      if (!shouldPause && config.businessHoursStrategy === 'pause') {
        const pauseHour = config.businessHoursPauseTime
          ? parseInt(config.businessHoursPauseTime.split(':')[0])
          : 18
        const resumeHour = config.businessHoursResumeTime
          ? parseInt(config.businessHoursResumeTime.split(':')[0])
          : 8

        const isBusinessHours = brtHours >= resumeHour && brtHours < pauseHour

        if (!isBusinessHours) {
          shouldPause = true
          pauseReason = `Business Hours (Current BRT: ${brtHours})`
        }
      }

      if (shouldPause) {
        console.log(`Campaign ${campaign.id} paused: ${pauseReason}`)
        results.push({ ...campaignResult, status: 'paused_temporarily' })
        continue
      }

      // Helper to finalize campaign
      const finalizeCampaign = async () => {
        const now = new Date()
        const startedAt = campaign.started_at
          ? new Date(campaign.started_at)
          : new Date(campaign.created_at)
        const executionTime = Math.max(
          0,
          Math.floor((now.getTime() - startedAt.getTime()) / 1000),
        )

        // SYNC: Count actual sent messages
        const { count: realSentCount, error: countError } = await supabase
          .from('campaign_messages')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'sent')

        const updatePayload: any = {
          status: 'finished',
          finished_at: now.toISOString(),
          execution_time: executionTime,
        }

        if (!countError && realSentCount !== null) {
          updatePayload.sent_messages = realSentCount
        }

        await supabase
          .from('campaigns')
          .update(updatePayload)
          .eq('id', campaign.id)

        campaignResult.status = 'finished'
      }

      // Check for completion
      const { count: pendingCount, error: pendingError } = await supabase
        .from('campaign_messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .in('status', ['aguardando', 'pending'])

      if (pendingError) {
        console.error(
          `Error checking pending messages for ${campaign.id}`,
          pendingError,
        )
        continue
      }

      if (pendingCount === 0) {
        // Ensure no active messages
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
      let messagesProcessedInThisLoop = 0

      while (
        campaignLoopActive &&
        Date.now() - startTime < MAX_EXECUTION_TIME
      ) {
        // 1. Check status again
        const { data: currentStatus } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single()

        if (
          currentStatus?.status === 'paused' ||
          currentStatus?.status === 'canceled'
        ) {
          console.log(`Campaign ${campaign.id} was paused/canceled`)
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
        const minInterval = (config.minInterval || 30) * 1000
        const maxInterval = (config.maxInterval || 40) * 1000

        // Ensure proper random range logic
        const intervalDelay = Math.floor(
          Math.random() * (maxInterval - minInterval + 1) + minInterval,
        )
        requiredDelay = intervalDelay

        // Batch Pause Logic
        if (
          config.useBatching &&
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
          console.log(`Batch pause active: +${batchPause / 1000}s`)
        }

        // If no messages sent yet, no delay needed for the very first one
        if (!hasMessagesSentReally) {
          requiredDelay = 0
        }

        const timeSinceLast = Date.now() - lastSentAt

        // STRICT DELAY ENFORCEMENT
        if (timeSinceLast < requiredDelay) {
          const waitTime = requiredDelay - timeSinceLast

          // Log wait plan
          console.log(
            `Msg #${sentMessagesCount + 1}: Waiting ${Math.round(waitTime / 1000)}s (Delay: ${requiredDelay / 1000}s, SinceLast: ${timeSinceLast / 1000}s)`,
          )

          // If the wait time is too long for this execution window, break and wait for next cron
          if (Date.now() + waitTime > startTime + MAX_EXECUTION_TIME) {
            console.log(
              `Wait time ${waitTime}ms exceeds execution window. Stopping to wait for next cron.`,
            )
            campaignLoopActive = false
            break
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        // Fetch ONE message to send (Locking strategy)
        const { data: messageToLock } = await supabase
          .from('campaign_messages')
          .select('id')
          .eq('campaign_id', campaign.id)
          .in('status', ['aguardando', 'pending'])
          .limit(1)
          .maybeSingle()

        if (!messageToLock) {
          // No more messages in 'aguardando'. Check for remaining processing ones
          const { count: remaining } = await supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['aguardando', 'sending', 'pending'])

          if (remaining === 0) {
            await finalizeCampaign()
          }
          campaignLoopActive = false
          break
        }

        // Lock it
        const sentAtTimestamp = new Date().toISOString()
        const { data: lockedMessage, error: lockError } = await supabase
          .from('campaign_messages')
          .update({ status: 'sending', sent_at: sentAtTimestamp })
          .eq('id', messageToLock.id)
          .in('status', ['aguardando', 'pending'])
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

          // Success - Update message status
          await supabase
            .from('campaign_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(), // Update to exact sent time
              error_message: null,
            })
            .eq('id', lockedMessage.id)

          // Increment campaign counter via RPC
          await supabase.rpc('increment_campaign_sent', { row_id: campaign.id })

          campaign.sent_messages = (campaign.sent_messages || 0) + 1
          campaignResult.messagesSent++
          messagesProcessedInThisLoop++
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

      // Update execution time
      if (campaignResult.status !== 'finished') {
        const startedAt = campaign.started_at
          ? new Date(campaign.started_at)
          : new Date(campaign.created_at!)
        const currentExecTime = Math.max(
          0,
          Math.floor((Date.now() - startedAt.getTime()) / 1000),
        )

        await supabase
          .from('campaigns')
          .update({ execution_time: currentExecTime })
          .eq('id', campaign.id)
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
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    )
  }
})

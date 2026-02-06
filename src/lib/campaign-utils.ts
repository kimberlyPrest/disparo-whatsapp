import {
  addSeconds,
  set,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
} from 'date-fns'

export interface ScheduleConfig {
  minInterval: number
  maxInterval: number
  useBatching: boolean
  batchSize?: number
  batchPauseMin?: number
  batchPauseMax?: number
  businessHoursStrategy: 'ignore' | 'pause'
  businessHoursPauseTime?: string
  businessHoursResumeTime?: string
  startTime: Date
}

export interface ScheduledMessage {
  contactIndex: number
  sendTime: Date
}

export interface ConflictResult {
  hasConflict: boolean
  conflictingCampaignId?: string
  conflictingCampaignName?: string
  suggestedTime?: Date
}

export function calculateCampaignSchedule(
  config: ScheduleConfig,
  totalMessages: number,
): ScheduledMessage[] {
  const schedule: ScheduledMessage[] = []
  let currentTime = new Date(config.startTime)

  let pauseHour = 18,
    pauseMinute = 0
  let resumeHour = 8,
    resumeMinute = 0

  if (
    config.businessHoursStrategy === 'pause' &&
    config.businessHoursPauseTime &&
    config.businessHoursResumeTime
  ) {
    ;[pauseHour, pauseMinute] = config.businessHoursPauseTime
      .split(':')
      .map(Number)
    ;[resumeHour, resumeMinute] = config.businessHoursResumeTime
      .split(':')
      .map(Number)
  }

  const avgInterval = (config.minInterval + config.maxInterval) / 2
  const avgBatchPause =
    config.useBatching && config.batchPauseMin && config.batchPauseMax
      ? (config.batchPauseMin + config.batchPauseMax) / 2
      : 0

  for (let i = 0; i < totalMessages; i++) {
    // Add interval (except for the first one if we want immediate start,
    // but usually spacing is desired for all messages to avoid burst)
    if (i > 0) {
      currentTime = addSeconds(currentTime, avgInterval)
    }

    // Check Batching
    if (
      config.useBatching &&
      config.batchSize &&
      i > 0 &&
      i % config.batchSize === 0
    ) {
      currentTime = addSeconds(currentTime, avgBatchPause)
    }

    // Check Business Hours
    if (config.businessHoursStrategy === 'pause') {
      const h = currentTime.getHours()
      const m = currentTime.getMinutes()
      const t = h * 60 + m // time in minutes
      const pauseT = pauseHour * 60 + pauseMinute
      const resumeT = resumeHour * 60 + resumeMinute

      // If outside hours (after pause time OR before resume time)
      const isAfterPause = t >= pauseT
      const isBeforeResume = t < resumeT

      if (isAfterPause || isBeforeResume) {
        if (isAfterPause) {
          // Move to next day resume time
          currentTime = addDays(currentTime, 1)
        }
        // If before resume (e.g. 05:00), we just move to resume time of same day
        // For 'after pause', we already added a day, so we set to resume time of that day
        currentTime = set(currentTime, {
          hours: resumeHour,
          minutes: resumeMinute,
          seconds: 0,
          milliseconds: 0,
        })
      }
    }

    schedule.push({
      contactIndex: i,
      sendTime: new Date(currentTime),
    })
  }

  return schedule
}

export function estimateCampaignEndTime(
  config: ScheduleConfig,
  totalMessages: number,
): Date {
  if (totalMessages === 0) return config.startTime

  const schedule = calculateCampaignSchedule(config, totalMessages)
  if (schedule.length === 0) return config.startTime

  return schedule[schedule.length - 1].sendTime
}

export function mapDbConfigToScheduleConfig(
  dbConfig: any,
  startTime: string | Date,
): ScheduleConfig {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime

  // Default values if config is missing or incomplete
  return {
    minInterval: dbConfig?.min_interval ?? 30,
    maxInterval: dbConfig?.max_interval ?? 60,
    useBatching: dbConfig?.batch_config?.enabled ?? false,
    batchSize: dbConfig?.batch_config?.size,
    batchPauseMin: dbConfig?.batch_config?.pause_min,
    batchPauseMax: dbConfig?.batch_config?.pause_max,
    businessHoursStrategy: dbConfig?.business_hours?.strategy ?? 'ignore',
    businessHoursPauseTime: dbConfig?.business_hours?.pause_at ?? '18:00',
    businessHoursResumeTime: dbConfig?.business_hours?.resume_at ?? '08:00',
    startTime: start,
  }
}

export function checkScheduleConflict(
  newConfig: ScheduleConfig,
  totalMessages: number,
  existingCampaigns: Array<{
    id: string
    name: string
    scheduled_at: string | null
    started_at: string | null
    total_messages: number | null
    config: any
  }>,
): ConflictResult {
  const BUFFER_MINUTES = 60

  const newStart = newConfig.startTime
  const newEnd = estimateCampaignEndTime(newConfig, totalMessages)

  // Extend new campaign window by buffer
  // We check if (ExistingStart - 60) < NewEnd AND (ExistingEnd + 60) > NewStart

  for (const campaign of existingCampaigns) {
    const campaignStartStr = campaign.started_at || campaign.scheduled_at
    if (!campaignStartStr) continue

    const campaignConfig = mapDbConfigToScheduleConfig(
      campaign.config,
      campaignStartStr,
    )
    const campaignEnd = estimateCampaignEndTime(
      campaignConfig,
      campaign.total_messages || 0,
    )
    const campaignStart = campaignConfig.startTime

    const existingStartBuffer = addMinutes(campaignStart, -BUFFER_MINUTES)
    const existingEndBuffer = addMinutes(campaignEnd, BUFFER_MINUTES)

    const hasOverlap =
      isAfter(newEnd, existingStartBuffer) &&
      isBefore(newStart, existingEndBuffer)

    if (hasOverlap) {
      // Calculate suggestion: End of this campaign + buffer
      const suggestion = addMinutes(campaignEnd, BUFFER_MINUTES + 5) // +5 min extra safety

      return {
        hasConflict: true,
        conflictingCampaignId: campaign.id,
        conflictingCampaignName: campaign.name,
        suggestedTime: suggestion,
      }
    }
  }

  return { hasConflict: false }
}

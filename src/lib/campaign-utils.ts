import {
  addSeconds,
  set,
  addDays,
  addMinutes,
  isBefore,
  isAfter,
  isSameDay,
  parseISO,
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
  // New Automatic Pause fields
  automaticPause?: boolean
  pauseTime?: string
  resumeDate?: Date
  resumeTime?: string
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

  // Business Hours setup
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

  // Automatic Pause setup
  let autoPauseHour = 0,
    autoPauseMinute = 0
  let autoResumeDateTime: Date | null = null

  if (
    config.automaticPause &&
    config.pauseTime &&
    config.resumeDate &&
    config.resumeTime
  ) {
    ;[autoPauseHour, autoPauseMinute] = config.pauseTime.split(':').map(Number)
    const [h, m] = config.resumeTime.split(':').map(Number)
    autoResumeDateTime = set(config.resumeDate, {
      hours: h,
      minutes: m,
      seconds: 0,
      milliseconds: 0,
    })
  }

  const avgInterval = (config.minInterval + config.maxInterval) / 2
  const avgBatchPause =
    config.useBatching && config.batchPauseMin && config.batchPauseMax
      ? (config.batchPauseMin + config.batchPauseMax) / 2
      : 0

  for (let i = 0; i < totalMessages; i++) {
    if (i > 0) {
      currentTime = addSeconds(currentTime, avgInterval)
    }

    if (
      config.useBatching &&
      config.batchSize &&
      i > 0 &&
      i % config.batchSize === 0
    ) {
      currentTime = addSeconds(currentTime, avgBatchPause)
    }

    // Check Automatic Pause (One-time interruption)
    if (autoResumeDateTime && isBefore(currentTime, autoResumeDateTime)) {
      const currentH = currentTime.getHours()
      const currentM = currentTime.getMinutes()

      // If we hit the pause time, or if we are on a day AFTER the start but BEFORE the resume
      const isPauseTimeReached =
        currentH > autoPauseHour ||
        (currentH === autoPauseHour && currentM >= autoPauseMinute)

      const isAfterStartDay =
        !isSameDay(currentTime, config.startTime) &&
        isAfter(currentTime, config.startTime)

      if (isPauseTimeReached || isAfterStartDay) {
        // Jump to resume time
        if (isBefore(currentTime, autoResumeDateTime)) {
          currentTime = new Date(autoResumeDateTime)
        }
      }
    }

    // Check Business Hours (Recurring)
    if (config.businessHoursStrategy === 'pause') {
      const h = currentTime.getHours()
      const m = currentTime.getMinutes()
      const t = h * 60 + m
      const pauseT = pauseHour * 60 + pauseMinute
      const resumeT = resumeHour * 60 + resumeMinute

      const isAfterPause = t >= pauseT
      const isBeforeResume = t < resumeT

      if (isAfterPause || isBeforeResume) {
        if (isAfterPause) {
          currentTime = addDays(currentTime, 1)
        }
        currentTime = set(currentTime, {
          hours: resumeHour,
          minutes: resumeMinute,
          seconds: 0,
          milliseconds: 0,
        })

        // After adjusting for business hours, we must re-check automatic pause
        // because we might have jumped into the forbidden zone or past it.
        if (autoResumeDateTime && isBefore(currentTime, autoResumeDateTime)) {
          const currentH = currentTime.getHours()
          const currentM = currentTime.getMinutes()
          const isPauseTimeReached =
            currentH > autoPauseHour ||
            (currentH === autoPauseHour && currentM >= autoPauseMinute)
          const isAfterStartDay =
            !isSameDay(currentTime, config.startTime) &&
            isAfter(currentTime, config.startTime)

          if (isPauseTimeReached || isAfterStartDay) {
            currentTime = new Date(autoResumeDateTime)
          }
        }
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
    automaticPause: dbConfig?.automatic_pause?.enabled ?? false,
    pauseTime: dbConfig?.automatic_pause?.pause_at,
    resumeDate: dbConfig?.automatic_pause?.resume_date
      ? parseISO(dbConfig.automatic_pause.resume_date)
      : undefined,
    resumeTime: dbConfig?.automatic_pause?.resume_time,
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
      const suggestion = addMinutes(campaignEnd, BUFFER_MINUTES + 5)

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

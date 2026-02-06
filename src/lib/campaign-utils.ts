import { addSeconds, set, addDays } from 'date-fns'

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

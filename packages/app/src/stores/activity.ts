import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StepRecord } from '@/types'
import { SCORE_THRESHOLDS, TIMING, LIMITS, getLocalDateString } from '@/utils/activity'

export const useActivityStore = defineStore('activity', () => {
  const todayDate = ref(getLocalDateString())
  const peakScore = ref(0)
  const activeMinutes = ref(0)
  const history = ref<StepRecord[]>([])

  let lastActiveTimestamp = 0

  function trackActiveMinute(score: number) {
    if (score < SCORE_THRESHOLDS.walk) return
    const now = Date.now()
    if (now - lastActiveTimestamp >= TIMING.activeMinuteWindowMs) {
      activeMinutes.value++
      lastActiveTimestamp = now
    }
  }

  function updatePeak(score: number) {
    if (score > peakScore.value) {
      peakScore.value = score
    }
  }

  function tryRollover(): { rolled: boolean; previousPeak: number; previousMinutes: number } {
    const today = getLocalDateString()
    if (today === todayDate.value) {
      return { rolled: false, previousPeak: peakScore.value, previousMinutes: activeMinutes.value }
    }

    const previousPeak = peakScore.value
    const previousMinutes = activeMinutes.value
    todayDate.value = today
    peakScore.value = 0
    activeMinutes.value = 0
    return { rolled: true, previousPeak, previousMinutes }
  }

  function addHistoryRecord(record: StepRecord) {
    history.value.push(record)
    if (history.value.length > LIMITS.historyMaxDays) {
      history.value = history.value.slice(-LIMITS.historyMaxDays)
    }
  }

  return {
    todayDate,
    peakScore,
    activeMinutes,
    history,
    trackActiveMinute,
    updatePeak,
    tryRollover,
    addHistoryRecord,
  }
})

import { watch, onMounted, onUnmounted } from 'vue'
import { useMonitorStore } from '@/stores/monitor'
import { usePetStore } from '@/stores/pet'
import { useActivityStore } from '@/stores/activity'
import { getLocalDateString, msUntilLocalMidnight } from '@/utils/activity'
import type { MovementState } from '@/types'

function accumulateSteps(
  movement: MovementState,
  score: number,
  petStore: ReturnType<typeof usePetStore>,
) {
  const isMoving = movement === 'walk' || movement === 'run' || movement === 'sprint'
  if (isMoving) {
    petStore.addSteps(Math.floor(score / 10))
  }
}

function handleDateRollover(
  petStore: ReturnType<typeof usePetStore>,
  activityStore: ReturnType<typeof useActivityStore>,
) {
  const { rolled, previousPeak, previousMinutes } = activityStore.tryRollover()
  if (!rolled) return

  if (petStore.dailySteps > 0) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    activityStore.addHistoryRecord({
      date: getLocalDateString(d),
      steps: petStore.dailySteps,
      peakScore: previousPeak,
      activeMinutes: previousMinutes,
    })
  }
  petStore.resetDailySteps()
}

export function useActivityScore() {
  const monitorStore = useMonitorStore()
  const petStore = usePetStore()
  const activityStore = useActivityStore()

  let midnightTimer: ReturnType<typeof setTimeout> | null = null

  function update() {
    const movement = monitorStore.movement
    const score = monitorStore.score

    petStore.setMovement(movement, Math.round(score))

    activityStore.updatePeak(score)
    activityStore.trackActiveMinute(score)

    accumulateSteps(movement, score, petStore)
    handleDateRollover(petStore, activityStore)
  }

  function scheduleMidnightReset() {
    if (midnightTimer) clearTimeout(midnightTimer)
    const ms = msUntilLocalMidnight() + 1000
    midnightTimer = setTimeout(() => {
      handleDateRollover(petStore, activityStore)
      scheduleMidnightReset()
    }, ms)
  }

  watch(
    () => [monitorStore.score, monitorStore.movement],
    () => update(),
    { immediate: true },
  )

  onMounted(() => {
    scheduleMidnightReset()
  })

  onUnmounted(() => {
    if (midnightTimer) clearTimeout(midnightTimer)
  })

  return {}
}

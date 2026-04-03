import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MovementState } from '@/types'

export const usePetStore = defineStore('pet', () => {
  const movementState = ref<MovementState>('idle')
  const activityScore = ref(0)
  const dailySteps = ref(0)
  const isDragging = ref(false)

  const formattedSteps = computed(() => dailySteps.value.toLocaleString())

  function setMovement(state: MovementState, score: number) {
    movementState.value = state
    activityScore.value = score
  }

  function addSteps(count: number) {
    dailySteps.value += count
  }

  function resetDailySteps() {
    dailySteps.value = 0
  }

  return {
    movementState,
    activityScore,
    dailySteps,
    isDragging,
    formattedSteps,
    setMovement,
    addSteps,
    resetDailySteps,
  }
})

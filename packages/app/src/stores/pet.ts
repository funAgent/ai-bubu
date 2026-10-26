import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import type {
  MovementState,
  MoodState,
  InteractionAnimation,
  PetAnimationState,
  ReactionEvent,
} from '@/types'
import { isReactEventPayload, REACTION_RULES } from '@/utils/react'

const INTERACTION_DURATIONS: Record<InteractionAnimation, number> = {
  pat: 1500,
  poke: 1000,
  celebrate: REACTION_RULES.work_done.duration,
  wave: 1500,
  react_start: REACTION_RULES.work_start.duration,
  react_multi: REACTION_RULES.multi_tool.duration,
}

export const usePetStore = defineStore('pet', () => {
  const movementState = ref<MovementState>('idle')
  const activityScore = ref(0)
  const dailySteps = ref(0)
  const isDragging = ref(false)

  const moodState = ref<MoodState>('normal')
  const interactionState = ref<InteractionAnimation | null>(null)
  const interactionTick = ref(0)
  const reactionEvent = ref<ReactionEvent | null>(null)
  const lastReactions = new Map<ReactionEvent, number>()
  let interactionTimer: ReturnType<typeof setTimeout> | null = null

  const formattedSteps = computed(() => dailySteps.value.toLocaleString())

  const resolvedAnimationState = computed<PetAnimationState>(() => {
    if (interactionState.value) return interactionState.value
    if (movementState.value === 'idle' && moodState.value !== 'normal') {
      return moodState.value
    }
    return movementState.value
  })

  function setMovement(state: MovementState, score: number) {
    movementState.value = state
    activityScore.value = score
  }

  function setMood(mood: MoodState) {
    moodState.value = mood
  }

  function clearInteraction() {
    if (interactionTimer) clearTimeout(interactionTimer)
    interactionTimer = null
    interactionState.value = null
    reactionEvent.value = null
  }

  function startInteraction(action: InteractionAnimation, duration: number) {
    if (interactionTimer) clearTimeout(interactionTimer)
    interactionState.value = action
    interactionTick.value++
    interactionTimer = setTimeout(clearInteraction, duration)
  }

  // Direct user/social interactions always take precedence over monitor reactions.
  function playInteraction(action: InteractionAnimation) {
    reactionEvent.value = null
    startInteraction(action, INTERACTION_DURATIONS[action])
  }

  function playReaction(payload: unknown): boolean {
    if (!isReactEventPayload(payload) || isDragging.value) return false
    const rule = REACTION_RULES[payload.event]
    if (interactionState.value) {
      if (!reactionEvent.value || REACTION_RULES[reactionEvent.value].priority >= rule.priority)
        return false
    }
    const now = Date.now()
    const last = lastReactions.get(payload.event)
    if (last !== undefined && now - last < rule.cooldown) return false
    lastReactions.set(payload.event, now)
    reactionEvent.value = payload.event
    startInteraction(rule.interaction, rule.duration)
    return true
  }

  watch(
    isDragging,
    (dragging) => {
      if (dragging && reactionEvent.value) clearInteraction()
    },
    { flush: 'sync' },
  )
  onScopeDispose(clearInteraction)

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
    moodState,
    interactionState,
    interactionTick,
    reactionEvent,
    formattedSteps,
    resolvedAnimationState,
    setMovement,
    setMood,
    playInteraction,
    playReaction,
    addSteps,
    resetDailySteps,
  }
})

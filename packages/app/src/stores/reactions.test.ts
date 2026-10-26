import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { usePetStore } from './pet'
import { REACTION_RULES } from '@/utils/react'
import type { ReactionEvent } from '@/types'

const event = (kind: ReactionEvent) => ({ event: kind, provider: 'codex-cli', durationSecs: 60 })

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => {
  disposePinia(pinia)
  vi.useRealTimers()
})

describe('monitor reaction arbitration', () => {
  it.each(['work_start', 'multi_tool', 'work_done'] as const)(
    'expires %s and restores the latest movement',
    (kind) => {
      const pet = usePetStore()
      pet.setMood('sleepy')
      expect(pet.playReaction(event(kind))).toBe(true)
      expect(pet.interactionState).toBe(REACTION_RULES[kind].interaction)
      expect(pet.reactionEvent).toBe(kind)
      pet.setMovement('sprint', 95)
      pet.addSteps(3)
      vi.advanceTimersByTime(REACTION_RULES[kind].duration - 1)
      expect(pet.reactionEvent).toBe(kind)
      vi.advanceTimersByTime(1)
      expect(pet.reactionEvent).toBeNull()
      expect(pet.resolvedAnimationState).toBe('sprint')
      expect(pet.activityScore).toBe(95)
      expect(pet.dailySteps).toBe(3)
    },
  )

  it('restores idle mood after a reaction', () => {
    const pet = usePetStore()
    pet.setMood('happy')
    pet.playReaction(event('work_start'))
    vi.advanceTimersByTime(900)
    expect(pet.resolvedAnimationState).toBe('happy')
  })

  it('allows only higher priority reactions to interrupt, without stale timers', () => {
    const pet = usePetStore()
    pet.playReaction(event('work_start'))
    vi.advanceTimersByTime(100)
    expect(pet.playReaction(event('multi_tool'))).toBe(true)
    expect(pet.playReaction(event('work_start'))).toBe(false)
    expect(pet.playReaction(event('multi_tool'))).toBe(false)
    vi.advanceTimersByTime(100)
    expect(pet.playReaction(event('work_done'))).toBe(true)
    expect(pet.playReaction(event('multi_tool'))).toBe(false)
    vi.advanceTimersByTime(1700)
    expect(pet.interactionState).toBe('celebrate')
    vi.advanceTimersByTime(300)
    expect(pet.interactionState).toBeNull()
    expect(pet.interactionTick).toBe(3)
  })

  it.each(['work_start', 'multi_tool', 'work_done'] as const)(
    'enforces independent %s cooldown including the exact boundary',
    (kind) => {
      const pet = usePetStore()
      expect(pet.playReaction(event(kind))).toBe(true)
      vi.advanceTimersByTime(REACTION_RULES[kind].cooldown - 1)
      expect(pet.playReaction(event(kind))).toBe(false)
      vi.advanceTimersByTime(1)
      expect(pet.playReaction(event(kind))).toBe(true)
    },
  )

  it('manual interactions interrupt reactions and are never interrupted by monitor events', () => {
    const pet = usePetStore()
    pet.playReaction(event('multi_tool'))
    pet.playInteraction('pat')
    expect(pet.reactionEvent).toBeNull()
    expect(pet.playReaction(event('work_done'))).toBe(false)
    vi.advanceTimersByTime(1500)
    expect(pet.interactionState).toBeNull()
    // A discarded reaction did not consume its cooldown and was not queued.
    expect(pet.playReaction(event('work_done'))).toBe(true)
  })

  it('dragging cancels the current reaction, ignores new ones and never replays them', () => {
    const pet = usePetStore()
    pet.playReaction(event('work_start'))
    pet.isDragging = true
    expect(pet.reactionEvent).toBeNull()
    expect(pet.interactionState).toBeNull()
    expect(pet.playReaction(event('multi_tool'))).toBe(false)
    pet.isDragging = false
    vi.advanceTimersByTime(40_000)
    expect(pet.interactionState).toBeNull()
    expect(pet.playReaction(event('multi_tool'))).toBe(true)
  })

  it('rejects invalid input without changing playback or consuming cooldown', () => {
    const pet = usePetStore()
    expect(pet.playReaction({ event: 'multi_tool' })).toBe(false)
    expect(pet.interactionTick).toBe(0)
    expect(pet.playReaction(event('multi_tool'))).toBe(true)
  })

  it('cleans up its timer on store disposal', () => {
    const pet = usePetStore()
    pet.playReaction(event('multi_tool'))
    pet.$dispose()
    expect(vi.getTimerCount()).toBe(0)
    expect(pet.interactionState).toBeNull()
  })
})

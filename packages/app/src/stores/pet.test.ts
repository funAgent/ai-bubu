import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePetStore } from './pet'

describe('usePetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with idle defaults', () => {
    const store = usePetStore()
    expect(store.movementState).toBe('idle')
    expect(store.activityScore).toBe(0)
    expect(store.dailySteps).toBe(0)
    expect(store.isDragging).toBe(false)
  })

  it('setMovement updates state and score', () => {
    const store = usePetStore()
    store.setMovement('sprint', 95)
    expect(store.movementState).toBe('sprint')
    expect(store.activityScore).toBe(95)
  })

  it('addSteps accumulates', () => {
    const store = usePetStore()
    store.addSteps(100)
    store.addSteps(50)
    expect(store.dailySteps).toBe(150)
  })

  it('resetDailySteps clears to 0', () => {
    const store = usePetStore()
    store.addSteps(500)
    store.resetDailySteps()
    expect(store.dailySteps).toBe(0)
  })

  it('formattedSteps returns locale string', () => {
    const store = usePetStore()
    store.addSteps(12345)
    expect(store.formattedSteps).toBe('12,345')
  })
})

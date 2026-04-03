import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useActivityStore } from './activity'

describe('useActivityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('updatePeak', () => {
    it('tracks the highest score', () => {
      const store = useActivityStore()
      store.updatePeak(30)
      expect(store.peakScore).toBe(30)
      store.updatePeak(80)
      expect(store.peakScore).toBe(80)
      store.updatePeak(50)
      expect(store.peakScore).toBe(80)
    })

    it('starts at 0', () => {
      const store = useActivityStore()
      expect(store.peakScore).toBe(0)
    })
  })

  describe('trackActiveMinute', () => {
    it('ignores scores below walk threshold', () => {
      const store = useActivityStore()
      store.trackActiveMinute(10)
      expect(store.activeMinutes).toBe(0)
    })

    it('increments on first qualifying call', () => {
      const store = useActivityStore()
      store.trackActiveMinute(25)
      expect(store.activeMinutes).toBe(1)
    })

    it('does not increment again within 60s window', () => {
      const store = useActivityStore()
      store.trackActiveMinute(30)
      expect(store.activeMinutes).toBe(1)
      store.trackActiveMinute(30)
      expect(store.activeMinutes).toBe(1)
    })

    it('increments again after 60s window', () => {
      const store = useActivityStore()
      const realNow = Date.now

      let fakeTime = 1_000_000
      vi.spyOn(Date, 'now').mockImplementation(() => fakeTime)

      store.trackActiveMinute(30)
      expect(store.activeMinutes).toBe(1)

      fakeTime += 61_000
      store.trackActiveMinute(30)
      expect(store.activeMinutes).toBe(2)

      Date.now = realNow
    })
  })

  describe('addHistoryRecord', () => {
    it('pushes records', () => {
      const store = useActivityStore()
      store.addHistoryRecord({
        date: '2026-04-01',
        steps: 1000,
        peakScore: 80,
        activeMinutes: 45,
      })
      expect(store.history).toHaveLength(1)
    })

    it('caps at historyMaxDays (30)', () => {
      const store = useActivityStore()
      for (let i = 0; i < 35; i++) {
        store.addHistoryRecord({
          date: `2026-03-${String(i + 1).padStart(2, '0')}`,
          steps: i * 100,
          peakScore: i,
          activeMinutes: i,
        })
      }
      expect(store.history).toHaveLength(30)
      expect(store.history[0].date).toBe('2026-03-06')
    })
  })

  describe('tryRollover', () => {
    it('returns rolled=false when date is the same', () => {
      const store = useActivityStore()
      const result = store.tryRollover()
      expect(result.rolled).toBe(false)
    })

    it('returns rolled=true and resets when date changes', () => {
      const store = useActivityStore()
      store.updatePeak(90)
      store.trackActiveMinute(50)

      store.todayDate = '2020-01-01'
      const result = store.tryRollover()
      expect(result.rolled).toBe(true)
      expect(result.previousPeak).toBe(90)
      expect(result.previousMinutes).toBe(1)
      expect(store.peakScore).toBe(0)
      expect(store.activeMinutes).toBe(0)
    })
  })
})

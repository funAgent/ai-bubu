import { describe, it, expect } from 'vitest'
import { getScoreColor, MOVEMENT_COLORS, SCORE_THRESHOLDS, TIMING, LIMITS } from './activity'

describe('getScoreColor', () => {
  it.each([
    [100, '#ef4444'],
    [85, '#ef4444'],
    [75, '#ef4444'],
    [74, '#f59e0b'],
    [50, '#f59e0b'],
    [20, '#4ade80'],
    [19, '#6366f1'],
    [0, '#6366f1'],
  ])('score %d → %s', (score, expected) => {
    expect(getScoreColor(score)).toBe(expected)
  })
})

describe('MOVEMENT_COLORS', () => {
  it('has all four states', () => {
    expect(MOVEMENT_COLORS).toHaveProperty('sprint')
    expect(MOVEMENT_COLORS).toHaveProperty('run')
    expect(MOVEMENT_COLORS).toHaveProperty('walk')
    expect(MOVEMENT_COLORS).toHaveProperty('idle')
  })

  it('sprint is red', () => {
    expect(MOVEMENT_COLORS.sprint.body).toBe('#ef4444')
  })
})

describe('SCORE_THRESHOLDS', () => {
  it('sprint > run > walk', () => {
    expect(SCORE_THRESHOLDS.sprint).toBeGreaterThan(SCORE_THRESHOLDS.run)
    expect(SCORE_THRESHOLDS.run).toBeGreaterThan(SCORE_THRESHOLDS.walk)
  })

  it('walk is the minimum moving threshold', () => {
    expect(SCORE_THRESHOLDS.walk).toBe(20)
  })
})

describe('TIMING constants', () => {
  it('active minute window is 60 seconds', () => {
    expect(TIMING.activeMinuteWindowMs).toBe(60_000)
  })
})

describe('LIMITS constants', () => {
  it('history max days is 90', () => {
    expect(LIMITS.historyMaxDays).toBe(90)
  })
})

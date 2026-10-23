import { describe, expect, it } from 'vitest'
import { mapReactEventToInteraction } from './react'

describe('mapReactEventToInteraction', () => {
  it('maps work_done to celebrate interaction', () => {
    expect(
      mapReactEventToInteraction({
        event: 'work_done',
        provider: 'claude-code',
        durationSecs: 120,
      }),
    ).toBe('celebrate')
  })

  it('returns null for unknown events', () => {
    expect(
      mapReactEventToInteraction({ event: 'something_new', provider: 'x', durationSecs: 10 }),
    ).toBeNull()
  })

  it('returns null for malformed payload', () => {
    expect(mapReactEventToInteraction({} as never)).toBeNull()
    expect(mapReactEventToInteraction(undefined as never)).toBeNull()
  })
})

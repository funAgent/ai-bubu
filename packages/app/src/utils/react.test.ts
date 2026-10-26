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

describe('phase two event mapping', () => {
  it.each([
    ['work_start', 'react_start'],
    ['multi_tool', 'react_multi'],
  ])('maps %s without reusing the completion gesture', (event, animation) => {
    expect(mapReactEventToInteraction({ event, provider: 'codex-cli', durationSecs: 0 })).toBe(
      animation,
    )
  })

  it.each([
    null,
    [],
    'work_start',
    { event: 'work_start', durationSecs: 0 },
    { event: 'work_start', provider: ' ', durationSecs: 0 },
    { event: 'multi_tool', provider: 'a', durationSecs: -1 },
    { event: 'work_done', provider: 'a', durationSecs: NaN },
    { event: 'work_start', provider: 'a', durationSecs: 1.5 },
    { event: 'toString', provider: 'a', durationSecs: 0 },
    { event: '__proto__', provider: 'a', durationSecs: 0 },
  ])('ignores malformed bridge payload %j', (payload) => {
    expect(mapReactEventToInteraction(payload)).toBeNull()
  })
})

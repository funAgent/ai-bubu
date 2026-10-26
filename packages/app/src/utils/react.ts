import type { InteractionAnimation, ReactionAnimation, ReactionEvent } from '@/types'

/** Rust 侧 monitor/react.rs 发出的 pet-react 事件载荷 */
export interface ReactEventPayload {
  event: string
  provider: string
  durationSecs: number
}

export const REACTION_RULES: Record<
  ReactionEvent,
  {
    interaction: InteractionAnimation
    animation: ReactionAnimation
    priority: number
    cooldown: number
    duration: number
  }
> = {
  work_start: {
    interaction: 'react_start',
    animation: 'react_start',
    priority: 1,
    cooldown: 15_000,
    duration: 900,
  },
  multi_tool: {
    interaction: 'react_multi',
    animation: 'react_multi',
    priority: 2,
    cooldown: 30_000,
    duration: 1600,
  },
  work_done: {
    interaction: 'celebrate',
    animation: 'react_done',
    priority: 3,
    cooldown: 120_000,
    duration: 2000,
  },
}

/** Treat the event bridge as an untrusted boundary; unknown/malformed events are a no-op. */
export function isReactEventPayload(
  payload: unknown,
): payload is ReactEventPayload & { event: ReactionEvent } {
  if (!payload || typeof payload !== 'object') return false
  const value = payload as ReactEventPayload
  return (
    Object.prototype.hasOwnProperty.call(REACTION_RULES, value.event) &&
    typeof value.provider === 'string' &&
    value.provider.trim().length > 0 &&
    Number.isSafeInteger(value.durationSecs) &&
    value.durationSecs >= 0
  )
}

/** Keep work_done's existing celebrate interaction and reuse the same overlay lifetime. */
export function mapReactEventToInteraction(payload: unknown): InteractionAnimation | null {
  return isReactEventPayload(payload) ? REACTION_RULES[payload.event].interaction : null
}

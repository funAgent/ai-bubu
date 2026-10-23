import type { InteractionAnimation } from '@/types'

/** Rust 侧 monitor/react.rs 发出的 pet-react 事件载荷 */
export interface ReactEventPayload {
  event: string
  provider: string
  durationSecs: number
}

/**
 * 事件驱动表情层（issue #128）：把宠物反应事件映射为已有的交互动画。
 * PoC 只处理 work_done；未知事件返回 null（前端无操作即"回退现有行为"）。
 */
export function mapReactEventToInteraction(
  payload: ReactEventPayload,
): InteractionAnimation | null {
  if (payload?.event === 'work_done') {
    return 'celebrate'
  }
  return null
}

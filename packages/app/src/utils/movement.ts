import type { MovementState } from '@/types'
import type { MessageKey } from '@/composables/useI18n'

export const MOVEMENT_STATE_KEYS: Record<MovementState, MessageKey> = {
  idle: 'stateIdle',
  walk: 'stateWalk',
  run: 'stateRun',
  sprint: 'stateSprint',
}

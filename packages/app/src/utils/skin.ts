import type { MovementState, SkinManifest, SkinAnimationConfig, ReactionEvent } from '@/types'
import { REACTION_RULES } from './react'

/** Optional reaction clips never fall back to idle: null preserves the live movement clip. */
export function resolveReactionAnimation(event: ReactionEvent | null, manifest: SkinManifest) {
  if (!event) return null
  const state = REACTION_RULES[event].animation
  const config = manifest.animations[state]
  return config ? { state, config } : null
}

export function resolveAnimation(
  state: MovementState,
  manifest: SkinManifest,
): { state: MovementState; config: SkinAnimationConfig } | null {
  if (manifest.animations[state]) {
    return { state, config: manifest.animations[state]! }
  }

  const visited = new Set<MovementState>([state])
  let fallback = manifest.fallback?.[state]
  while (fallback && !visited.has(fallback)) {
    visited.add(fallback)
    if (manifest.animations[fallback]) {
      return { state: fallback, config: manifest.animations[fallback]! }
    }
    fallback = manifest.fallback?.[fallback]
  }

  if (manifest.animations.idle) {
    return { state: 'idle', config: manifest.animations.idle! }
  }

  return null
}

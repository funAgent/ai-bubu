// === Movement System ===

export type MovementState = 'sprint' | 'run' | 'walk' | 'idle'

export const MOVEMENT_LABELS: Record<MovementState, string> = {
  sprint: '飞跑',
  run: '跑步',
  walk: '散步',
  idle: '空闲',
}

export interface StepRecord {
  date: string
  steps: number
  peakScore: number
  activeMinutes: number
}

// === Monitor ===

export type ActivityLevel = 'active_high' | 'active_medium' | 'active_low' | 'inactive'

export interface ProviderStatus {
  providerId: string
  providerName: string
  activity: ActivityLevel
  lastActiveTs: number | null
  linesAdded: number | null
  filesChanged: number | null
  modelName: string | null
}

export interface MonitorUpdate {
  providers: ProviderStatus[]
  score: number
  movement: MovementState
  activeProviderCount: number
  timestamp: number
}

export function isValidMovementState(s: string): s is MovementState {
  return s === 'sprint' || s === 'run' || s === 'walk' || s === 'idle'
}

// === Social ===

export interface PeerInfo {
  peerId: string
  nickname: string
  team: string
  dailySteps: number
  activityScore: number
  movementState: MovementState
  petSkin: string
  lastSeen: number
  isOnline: boolean
}

export interface TeamStats {
  name: string
  totalSteps: number
  memberCount: number
  members: PeerInfo[]
}

// === Skin System (updated for MovementState) ===

export type AnimationFormat = 'lottie' | 'sprite' | 'gif' | 'apng'

export interface SpriteConfig {
  frameWidth: number
  frameHeight: number
  frameCount: number
  columns: number
  fps: number
  startFrame?: number
}

export interface SkinAnimationConfig {
  file: string
  loop: boolean
  duration?: number
  sprite?: SpriteConfig
}

export interface SkinManifest {
  id: string
  name: string
  version: string
  author: string
  source?: string
  license?: string
  description: string
  style: string
  format: AnimationFormat
  size: { width: number; height: number }
  animations: Partial<Record<MovementState, SkinAnimationConfig>>
  sounds?: Partial<Record<MovementState, string>>
  fallback?: Partial<Record<MovementState, MovementState>>
}

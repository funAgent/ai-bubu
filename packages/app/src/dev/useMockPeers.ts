import { useSocialStore } from '@/stores/social'
import { usePetStore } from '@/stores/pet'
import { currentLang } from '@/composables/useI18n'
import type { PeerInfo, MovementState, MoodState } from '@/types'

interface MockDef {
  zh: string
  en: string
  petSkin: string
  movementState: MovementState
  moodState: MoodState
  stepsOffset: number
}

const BASE_PEERS: MockDef[] = [
  {
    zh: '代码喵',
    en: 'CodeCat',
    petSkin: 'mort',
    movementState: 'sprint',
    moodState: 'excited',
    stepsOffset: 1800,
  },
  {
    zh: '冲刺鸟',
    en: 'SprintBird',
    petSkin: 'tard',
    movementState: 'run',
    moodState: 'happy',
    stepsOffset: 900,
  },
  {
    zh: '键盘侠',
    en: 'KeyHero',
    petSkin: 'doux',
    movementState: 'idle',
    moodState: 'sleepy',
    stepsOffset: -100,
  },
  {
    zh: '摸鱼侠',
    en: 'SlackMan',
    petSkin: 'vita',
    movementState: 'walk',
    moodState: 'normal',
    stepsOffset: -1200,
  },
  {
    zh: '咖啡因',
    en: 'Caffeine',
    petSkin: 'tard',
    movementState: 'idle',
    moodState: 'sleepy',
    stepsOffset: -2500,
  },
]

const MOCK_PEERS: MockDef[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    ...BASE_PEERS[0],
    stepsOffset: BASE_PEERS[0].stepsOffset + i * 200,
  })),
  ...BASE_PEERS.slice(1),
  ...Array.from({ length: 3 }, (_, i) => ({
    ...BASE_PEERS[4],
    stepsOffset: BASE_PEERS[4].stepsOffset - i * 300,
  })),
]

export function startMockPeers() {
  const socialStore = useSocialStore()
  const petStore = usePetStore()

  function inject() {
    const isZh = currentLang.value === 'zh'
    const mySteps = petStore.dailySteps
    MOCK_PEERS.forEach((def, i) => {
      const peer: PeerInfo = {
        peerId: `mock-peer-${i}`,
        nickname: isZh ? def.zh : def.en,
        dailySteps: Math.max(0, mySteps + def.stepsOffset),
        activityScore:
          def.movementState === 'sprint'
            ? 95
            : def.movementState === 'run'
              ? 60
              : def.movementState === 'walk'
                ? 30
                : 5,
        movementState: def.movementState,
        moodState: def.moodState,
        petSkin: def.petSkin,
        lastSeen: Date.now(),
        isOnline: true,
      }
      socialStore.updatePeer(peer)
    })
  }

  inject()
  const timer = setInterval(inject, 5000)

  const MOOD_KEYS: Record<string, MoodState> = {
    '1': 'normal',
    '2': 'sleepy',
    '3': 'excited',
    '4': 'happy',
  }
  function onKey(e: KeyboardEvent) {
    const mood = MOOD_KEYS[e.key]
    if (mood) {
      petStore.setMood(mood)
      console.warn(`[MockPeers] mood → ${mood}`)
    }
  }
  window.addEventListener('keydown', onKey)

  console.warn(
    '[MockPeers] injected',
    MOCK_PEERS.length,
    'mock peers. Press 1/2/3/4 to switch mood: normal/sleepy/excited/happy',
  )
  return () => {
    clearInterval(timer)
    window.removeEventListener('keydown', onKey)
  }
}

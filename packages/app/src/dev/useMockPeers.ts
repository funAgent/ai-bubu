import { useSocialStore } from '@/stores/social'
import { usePetStore } from '@/stores/pet'
import { currentLang } from '@/composables/useI18n'
import type { PeerInfo, MovementState } from '@/types'

interface MockDef {
  zh: string
  en: string
  petSkin: string
  movementState: MovementState
  stepsOffset: number
}

const BASE_PEERS: MockDef[] = [
  { zh: '代码喵', en: 'CodeCat', petSkin: '002-mort', movementState: 'sprint', stepsOffset: 1800 },
  { zh: '冲刺鸟', en: 'SprintBird', petSkin: '001-tard', movementState: 'run', stepsOffset: 900 },
  { zh: '键盘侠', en: 'KeyHero', petSkin: '003-doux', movementState: 'idle', stepsOffset: -100 },
  { zh: '摸鱼侠', en: 'SlackMan', petSkin: '000-vita', movementState: 'walk', stepsOffset: -1200 },
  { zh: '咖啡因', en: 'Caffeine', petSkin: '001-tard', movementState: 'idle', stepsOffset: -2500 },
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
            ? 90
            : def.movementState === 'run'
              ? 60
              : def.movementState === 'walk'
                ? 30
                : 5,
        movementState: def.movementState,
        petSkin: def.petSkin,
        lastSeen: Date.now(),
        isOnline: true,
      }
      socialStore.updatePeer(peer)
    })
  }

  inject()
  const timer = setInterval(inject, 5000)
  console.warn('[MockPeers] injected', MOCK_PEERS.length, 'mock peers')
  return () => clearInterval(timer)
}

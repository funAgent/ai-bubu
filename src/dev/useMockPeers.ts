import { useSocialStore } from '../stores/social'
import { usePetStore } from '../stores/pet'
import { currentLang } from '../composables/useI18n'
import type { PeerInfo, MovementState } from '../types'

interface MockDef {
  zh: string
  en: string
  petSkin: string
  movementState: MovementState
  stepsOffset: number
}

const MOCK_PEERS: MockDef[] = [
  { zh: '代码喵', en: 'CodeCat',    petSkin: 'mort', movementState: 'sprint', stepsOffset: 1800 },
  { zh: '冲刺鸟', en: 'SprintBird', petSkin: 'tard', movementState: 'run',    stepsOffset: 900 },
  { zh: '键盘侠', en: 'KeyHero',    petSkin: 'doux', movementState: 'idle',   stepsOffset: -100 },
  { zh: '摸鱼侠', en: 'SlackMan',   petSkin: 'vita', movementState: 'walk',   stepsOffset: -1200 },
  { zh: '咖啡因', en: 'Caffeine',   petSkin: 'tard', movementState: 'idle',   stepsOffset: -2500 },
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
        team: '',
        dailySteps: Math.max(0, mySteps + def.stepsOffset),
        activityScore: def.movementState === 'sprint' ? 90
          : def.movementState === 'run' ? 60
          : def.movementState === 'walk' ? 30 : 5,
        movementState: def.movementState,
        petSkin: def.petSkin,
        lastSeen: Date.now(),
        isOnline: true,
      }
      socialStore.updatePeer(peer)
    })
  }

  inject()
  setInterval(inject, 5000)
  console.log('[MockPeers] injected', MOCK_PEERS.length, 'mock peers')
}

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PeerInfo, TeamStats } from '@/types'
import { isValidMovementState } from '@/types'

export const useSocialStore = defineStore('social', () => {
  const peers = ref<Map<string, PeerInfo>>(new Map())
  const isConnected = ref(false)

  const onlinePeers = computed(() =>
    Array.from(peers.value.values()).filter((p) => p.isOnline),
  )

  const leaderboard = computed(() =>
    Array.from(peers.value.values())
      .filter((p) => p.isOnline)
      .sort((a, b) => b.dailySteps - a.dailySteps),
  )

  const teams = computed(() => {
    const teamMap = new Map<string, PeerInfo[]>()
    for (const peer of onlinePeers.value) {
      if (!peer.team) continue
      if (!teamMap.has(peer.team)) teamMap.set(peer.team, [])
      teamMap.get(peer.team)!.push(peer)
    }

    const result: TeamStats[] = []
    for (const [name, members] of teamMap) {
      result.push({
        name,
        totalSteps: members.reduce((sum, m) => sum + m.dailySteps, 0),
        memberCount: members.length,
        members,
      })
    }
    return result.sort((a, b) => b.totalSteps - a.totalSteps)
  })

  function updatePeer(data: PeerInfo) {
    const validated = { ...data }
    if (!isValidMovementState(validated.movementState)) {
      validated.movementState = 'idle'
    }
    validated.nickname = (validated.nickname || '').slice(0, 20)
    validated.team = (validated.team || '').slice(0, 20)
    if (validated.isOnline) {
      peers.value.set(validated.peerId, { ...validated, lastSeen: Date.now() })
    } else {
      peers.value.delete(validated.peerId)
    }
  }

  function clearAll() {
    peers.value.clear()
    isConnected.value = false
  }

  return {
    peers,
    isConnected,
    onlinePeers,
    leaderboard,
    teams,
    updatePeer,
    clearAll,
  }
})

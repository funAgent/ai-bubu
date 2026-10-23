import { onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useMonitorStore } from '@/stores/monitor'
import { usePetStore } from '@/stores/pet'
import { mapReactEventToInteraction, type ReactEventPayload } from '@/utils/react'
import type { MonitorUpdate } from '@/types'

export function useMonitor() {
  const store = useMonitorStore()
  const petStore = usePetStore()
  let unlisten: UnlistenFn | null = null
  let unlistenReact: UnlistenFn | null = null
  let mounted = true

  onMounted(async () => {
    try {
      const fn = await listen<MonitorUpdate>('monitor-update', (event) => {
        store.updateFromEvent(event.payload)
      })
      if (mounted) {
        unlisten = fn
      } else {
        fn()
      }
    } catch (err) {
      console.error('Failed to listen for monitor updates:', err)
    }

    try {
      const fn = await listen<ReactEventPayload>('pet-react', (event) => {
        const interaction = mapReactEventToInteraction(event.payload)
        if (interaction) {
          petStore.playInteraction(interaction)
        }
      })
      if (mounted) {
        unlistenReact = fn
      } else {
        fn()
      }
    } catch (err) {
      console.error('Failed to listen for pet react events:', err)
    }
  })

  onUnmounted(() => {
    mounted = false
    unlisten?.()
    unlistenReact?.()
  })

  return { store }
}

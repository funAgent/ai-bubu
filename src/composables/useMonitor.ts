import { onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useMonitorStore } from '../stores/monitor'
import type { MonitorUpdate } from '../types'

export function useMonitor() {
  const store = useMonitorStore()
  let unlisten: UnlistenFn | null = null

  onMounted(async () => {
    unlisten = await listen<MonitorUpdate>('monitor-update', (event) => {
      store.updateFromEvent(event.payload)
    })
  })

  onUnmounted(() => {
    unlisten?.()
  })

  return { store }
}

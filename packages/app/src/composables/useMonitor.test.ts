import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, disposePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useMonitor } from './useMonitor'
import { usePetStore } from '@/stores/pet'
import { listen } from '@tauri-apps/api/event'

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('routes pet-react bridge events through arbitration and unsubscribes on unmount', async () => {
  vi.useFakeTimers()
  const handlers = new Map<string, (event: { payload: unknown }) => void>()
  const unlisten = vi.fn()
  vi.mocked(listen).mockImplementation(async (name, handler) => {
    handlers.set(String(name), handler as (event: { payload: unknown }) => void)
    return unlisten
  })
  const pinia = createPinia()
  const wrapper = mount(
    defineComponent({
      setup() {
        useMonitor()
        return () => null
      },
    }),
    { global: { plugins: [pinia] } },
  )
  await flushPromises()
  const pet = usePetStore(pinia)
  const emit = handlers.get('pet-react')!
  emit({ payload: { event: 'work_start', provider: 'codex-cli', durationSecs: 0 } })
  expect(pet.reactionEvent).toBe('work_start')
  emit({ payload: { event: 'multi_tool', provider: 'codex-cli', durationSecs: 1 } })
  expect(pet.reactionEvent).toBe('multi_tool')
  pet.playInteraction('pat')
  emit({ payload: { event: 'work_done', provider: 'codex-cli', durationSecs: 60 } })
  expect(pet.interactionState).toBe('pat')
  wrapper.unmount()
  expect(unlisten).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(1500)
  emit({ payload: { event: 'work_done', provider: 'codex-cli', durationSecs: 60 } })
  expect(pet.interactionState).toBeNull()
  disposePinia(pinia)
})

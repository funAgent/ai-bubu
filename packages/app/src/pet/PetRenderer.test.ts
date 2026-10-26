import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import PetRenderer from './PetRenderer.vue'
import PetEffects from './PetEffects.vue'
import { usePetStore } from '@/stores/pet'
import { useSkinStore } from '@/stores/skin'
import type { SkinManifest } from '@/types'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn() } }))
const manifest: SkinManifest = {
  id: 'legacy',
  name: 'Legacy',
  version: '1',
  author: 'test',
  description: '',
  style: 'pixel',
  format: 'sprite',
  size: { width: 48, height: 48 },
  animations: { idle: { file: 'idle.png', loop: true }, run: { file: 'run.png', loop: true } },
}
const SpriteStub = defineComponent({
  props: { src: { type: String, required: true }, loop: Boolean },
  template: '<div class="sprite" :data-src="src" :data-loop="loop" />',
})
let pinia: ReturnType<typeof createPinia>
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => {
  vi.useFakeTimers()
  pinia = createPinia()
  setActivePinia(pinia)
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => structuredClone(manifest),
  } as Response)
})
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  disposePinia(pinia)
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function renderPet() {
  const wrapper = mount(PetRenderer, {
    global: { plugins: [pinia], stubs: { SpriteRenderer: SpriteStub } },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
const event = (event: string) => ({ event, provider: 'codex-cli', durationSecs: 60 })

describe('pet reaction rendering', () => {
  it('keeps the legacy movement player mounted through both overlays and restores movement/mood', async () => {
    const wrapper = await renderPet()
    const pet = usePetStore()
    pet.setMovement('run', 60)
    await nextTick()
    const player = wrapper.find('.sprite').element
    pet.playReaction(event('work_start'))
    await flushPromises()
    expect(wrapper.find('.pet-renderer').classes()).toContain('react-start')
    expect(wrapper.attributes('data-reaction')).toBe('work_start')
    expect(wrapper.find('.sprite').element).toBe(player)
    pet.playReaction(event('multi_tool'))
    await flushPromises()
    expect(wrapper.find('.pet-renderer').classes()).toContain('react-multi')
    expect(wrapper.find('.sprite').attributes('data-src')).toMatch(/run.png$/)
    expect(wrapper.find('.sprite').element).toBe(player)
    pet.setMovement('idle', 0)
    pet.setMood('happy')
    vi.advanceTimersByTime(1600)
    await nextTick()
    expect(wrapper.find('.pet-renderer').classes()).toContain('mood-happy')
    expect(wrapper.attributes('data-reaction')).toBeUndefined()
  })

  it('uses optional clips through the same player, swaps skins in flight and returns to movement', async () => {
    const wrapper = await renderPet()
    const pet = usePetStore()
    const skin = useSkinStore()
    skin.currentManifest.animations.react_multi = { file: 'busy.png', loop: false }
    pet.playReaction(event('multi_tool'))
    await flushPromises()
    expect(wrapper.find('.sprite').attributes('data-src')).toMatch(/busy.png$/)
    expect(wrapper.find('.sprite').attributes('data-loop')).toBe('false')
    expect(wrapper.find('.pet-renderer').classes()).not.toContain('react-multi')
    skin.currentManifest = structuredClone(manifest)
    await nextTick()
    expect(wrapper.find('.sprite').attributes('data-src')).toMatch(/idle.png$/)
    expect(wrapper.find('.pet-renderer').classes()).toContain('react-multi')
    vi.advanceTimersByTime(1600)
    await nextTick()
    expect(wrapper.find('.pet-renderer').classes()).toContain('breathing')
  })

  it('does not double animate optional completion clips', async () => {
    const wrapper = await renderPet()
    useSkinStore().currentManifest.animations.react_done = { file: 'done.png', loop: false }
    usePetStore().playReaction(event('work_done'))
    await flushPromises()
    expect(wrapper.find('.sprite').attributes('data-src')).toMatch(/done.png$/)
    expect(wrapper.find('.pet-renderer').classes()).not.toContain('interact-celebrate')
  })

  it('clears event particles on manual interruption, drag and component unmount', async () => {
    const wrapper = mount(PetEffects, { global: { plugins: [pinia] } })
    wrappers.push(wrapper)
    const pet = usePetStore()
    pet.playReaction(event('multi_tool'))
    await nextTick()
    expect(wrapper.findAll('.particle')).toHaveLength(2)
    pet.playInteraction('poke')
    await nextTick()
    expect(wrapper.findAll('.particle')).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.findAll('.particle')).toHaveLength(0)
    pet.playReaction(event('work_start'))
    await nextTick()
    pet.isDragging = true
    await nextTick()
    expect(wrapper.findAll('.particle')).toHaveLength(0)
    pet.isDragging = false
    pet.playReaction(event('work_done'))
    await nextTick()
    wrapper.unmount()
    pet.$dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PetRenderer from '@/pet/PetRenderer.vue'
import PetEffects from '@/pet/PetEffects.vue'
import { usePetStore } from '@/stores/pet'
import { useSkinStore } from '@/stores/skin'
import { useSettingsStore } from '@/stores/settings'
import { REACTION_RULES } from '@/utils/react'
import type { MovementState, ReactionEvent } from '@/types'

const pet = usePetStore()
const skin = useSkinStore()
const settings = useSettingsStore()
// Only adapt the native resource URL; preserve the production clip selection and player.
function browserAnimation<T extends { src: string }>(animation: T | null): T | null {
  return animation
    ? { ...animation, src: animation.src.replace('skin://localhost/', '/skins/') }
    : null
}
const movementAnimation = skin.getAnimationForState.bind(skin)
const reactionAnimation = skin.getReactionAnimation.bind(skin)
skin.getAnimationForState = (state) => browserAnimation(movementAnimation(state))
skin.getReactionAnimation = (event) => browserAnimation(reactionAnimation(event))
const skins = ref<string[]>([])
const result = ref('等待事件')
const dark = ref(false)
const sequencing = ref(false)
const timers = new Set<ReturnType<typeof setTimeout>>()
const active = computed(() => pet.reactionEvent ?? pet.interactionState ?? pet.movementState)

onMounted(async () => {
  skins.value = await fetch('/skins/order.json').then((r) => r.json())
})
onUnmounted(() => {
  timers.forEach(clearTimeout)
  pet.$dispose()
})
function react(event: ReactionEvent) {
  const played = pet.playReaction({
    event,
    provider: 'codex-cli',
    durationSecs: event === 'work_start' ? 0 : 60,
  })
  result.value = `${event} · ${played ? '已播放' : '被冷却、优先级或拖动规则忽略'}`
}
function later(action: () => void, delay: number) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    action()
  }, delay)
  timers.add(timer)
}
function sequence() {
  sequencing.value = true
  pet.setMovement('walk', 30)
  react('work_start')
  later(() => {
    pet.setMovement('run', 65)
    react('multi_tool')
  }, 1100)
  later(() => {
    pet.setMovement('idle', 0)
    react('work_done')
  }, 3000)
  later(() => {
    sequencing.value = false
  }, 5100)
}
function movement(event: Event) {
  if (event.target instanceof window.HTMLSelectElement) {
    pet.setMovement(event.target.value as MovementState, 0)
  }
}
function changeSkin(event: Event) {
  if (event.target instanceof window.HTMLSelectElement) {
    settings.currentSkinId = event.target.value
  }
}
function reset() {
  window.location.reload()
}
</script>

<template>
  <main :class="{ dark }">
    <header>
      <p>AIbubu / 开发验证</p>
      <h1>实时宠物反应</h1>
      <p>复用应用内的状态管理、皮肤与播放器。这里注入模拟事件，不启动本机 Agent 监测。</p>
    </header>
    <section class="stage" aria-label="宠物预览">
      <div class="pet">
        <PetEffects />
        <PetRenderer />
      </div>
      <output aria-live="polite" data-testid="state">{{ active }}</output>
    </section>
    <section class="controls" aria-label="验证控制">
      <label>
        皮肤
        <select :value="settings.currentSkinId" @change="changeSkin">
          <option v-for="id in skins" :key="id" :value="id">{{ id }}</option>
        </select>
      </label>
      <label>
        基础运动
        <select :value="pet.movementState" @change="movement">
          <option v-for="state in ['idle', 'walk', 'run', 'sprint']" :key="state">
            {{ state }}
          </option>
        </select>
      </label>
      <label>
        <input v-model="dark" type="checkbox" />
        深色背景
      </label>
      <label>
        <input v-model="pet.isDragging" type="checkbox" />
        模拟拖动
      </label>
      <div class="actions">
        <button v-for="(rule, event) in REACTION_RULES" :key="event" @click="react(event)">
          {{ event }}
          <small>{{ rule.duration / 1000 }}s</small>
        </button>
        <button @click="pet.playInteraction('pat')">抚摸打断</button>
        <button :disabled="sequencing" @click="sequence">播放完整流程</button>
        <button @click="reset">重置冷却</button>
      </div>
      <p role="status">{{ result }}</p>
    </section>
    <footer>
      <p>优先级：手动互动 → 完成 → 多工具 → 开工。冷却：15 / 30 / 120 秒。</p>
      <p>
        当前 {{ skin.currentManifest.name }} 使用原有运动帧与 CSS 反应。可选反应帧：react_start /
        react_multi / react_done。
      </p>
    </footer>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f5f4f0;
}
main {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px max(24px, calc((100vw - 800px) / 2));
  color: #24262b;
  background: #f5f4f0;
}
main.dark {
  background: #202227;
  color: #e8e8e2;
}
header p,
footer p {
  opacity: 0.7;
  font-size: 14px;
  line-height: 1.6;
}
h1 {
  margin: 8px 0;
  font-size: 28px;
}
.stage {
  height: 260px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-block: 1px solid #8884;
  margin: 24px 0;
}
.pet {
  position: relative;
}
output {
  position: absolute;
  bottom: 20px;
  font:
    14px ui-monospace,
    monospace;
}
.controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}
label {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
button,
select {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 1px solid #8888;
  border-radius: 6px;
  padding: 8px 12px;
}
option {
  color: #24262b;
}
button {
  cursor: pointer;
}
button:hover {
  background: #8882;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
}
small {
  opacity: 0.6;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
[role='status'] {
  min-height: 24px;
  font:
    13px ui-monospace,
    monospace;
}
footer {
  margin-top: 20px;
}
</style>

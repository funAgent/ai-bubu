<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import { usePetStore } from '../stores/pet'
import { useSkinStore } from '../stores/skin'
import { useSettingsStore } from '../stores/settings'
import { MOVEMENT_LABELS } from '../types'
import { getScoreColor } from '../utils/activity'
import type { MovementState } from '../types'
import SpriteRenderer from '../pet/renderers/SpriteRenderer.vue'

const petStore = usePetStore()
const skinStore = useSkinStore()
const settings = useSettingsStore()

const availableSkins = computed(() =>
  skinStore.catalogLoaded
    ? skinStore.catalog.map(e => e.id)
    : [settings.currentSkinId],
)

const ORIGINAL_SIZE = { width: 200, height: 240 }
const TESTER_SIZE = { width: 560, height: 460 }

const ALL_STATES: { state: MovementState; score: number }[] = [
  { state: 'sprint', score: 90 },
  { state: 'run',    score: 60 },
  { state: 'walk',   score: 30 },
  { state: 'idle',   score: 5 },
]

const manifest = computed(() => skinStore.currentManifest)
const basePath = computed(() => skinStore.skinBasePath)
function animFor(state: MovementState) {
  const anims = manifest.value.animations
  return anims[state] ?? anims.idle ?? null
}

onMounted(async () => {
  petStore.testMode = true
  if (!skinStore.catalogLoaded) skinStore.loadCatalog()
  const win = getCurrentWindow()
  await win.setSize(new LogicalSize(TESTER_SIZE.width, TESTER_SIZE.height))
})

onUnmounted(async () => {
  petStore.testMode = false
  const win = getCurrentWindow()
  await win.setSize(new LogicalSize(ORIGINAL_SIZE.width, ORIGINAL_SIZE.height))
})

function switchSkin(skinId: string) {
  settings.currentSkinId = skinId
}
</script>

<template>
  <div class="skin-tester">
    <div class="tester-header">
      <div class="header-left">
        <span class="tester-title">Skin Tester</span>
        <span class="skin-name">{{ manifest.name }}</span>
      </div>
      <span class="tester-hint">T 关闭</span>
    </div>

    <div class="skin-switcher">
      <button
        v-for="skin in availableSkins"
        :key="skin"
        class="skin-btn"
        :class="{ active: settings.currentSkinId === skin }"
        @click="switchSkin(skin)"
      >
        {{ skin }}
      </button>
    </div>

    <div class="states-grid">
      <div
        v-for="s in ALL_STATES"
        :key="s.state"
        class="state-cell"
      >
        <div class="cell-preview">
          <SpriteRenderer
            v-if="animFor(s.state)"
            :src="basePath + animFor(s.state)!.file"
            :frame-width="animFor(s.state)!.sprite?.frameWidth ?? 32"
            :frame-height="animFor(s.state)!.sprite?.frameHeight ?? 32"
            :frame-count="animFor(s.state)!.sprite?.frameCount ?? 1"
            :columns="animFor(s.state)!.sprite?.columns ?? 1"
            :fps="animFor(s.state)!.sprite?.fps ?? 6"
            :start-frame="animFor(s.state)!.sprite?.startFrame ?? 0"
            :loop="animFor(s.state)!.loop ?? true"
          />
          <div v-else class="no-anim">N/A</div>
        </div>
        <div class="cell-label">
          <span class="dot" :style="{ background: getScoreColor(s.score) }"></span>
          {{ MOVEMENT_LABELS[s.state] }}
        </div>
        <div class="cell-meta" v-if="animFor(s.state)?.sprite">
          {{ animFor(s.state)!.sprite!.fps }}fps ·
          f{{ animFor(s.state)!.sprite!.startFrame }}-{{ animFor(s.state)!.sprite!.startFrame! + animFor(s.state)!.sprite!.frameCount - 1 }}
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.skin-tester {
  position: fixed;
  inset: 0;
  background: #0e0f1e;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.tester-title {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.skin-name {
  font-size: 11px;
  color: #64748b;
}

.tester-hint {
  font-size: 10px;
  color: #475569;
  background: rgba(255,255,255,0.05);
  padding: 3px 8px;
  border-radius: 5px;
}

.skin-switcher {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}

.skin-btn {
  padding: 5px 14px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  color: #94a3b8;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.skin-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

.skin-btn.active {
  background: rgba(99,102,241,0.15);
  color: #818cf8;
  border-color: rgba(99,102,241,0.3);
}

.states-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 14px 16px;
  flex: 1;
}

.state-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 12px 8px 10px;
}

.cell-preview {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
}

.no-anim {
  color: #334155;
  font-size: 11px;
}

.cell-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cell-meta {
  font-size: 9px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}
</style>

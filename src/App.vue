<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import PetCanvas from './pet/PetCanvas.vue'
import PeerOverlay from './pet/PeerOverlay.vue'
import StepDisplay from './pet/StepDisplay.vue'
import SocialPanel from './social/SocialPanel.vue'
import { useMonitor } from './composables/useMonitor'
import { useActivityScore } from './composables/useActivityScore'
import { useStepCounter } from './composables/useStepCounter'
import { useSocial } from './composables/useSocial'
import { useTrayIcon } from './composables/useTrayIcon'
import { useSkinStore } from './stores/skin'
import { useSettingsStore } from './stores/settings'

import { defineAsyncComponent } from 'vue'

const isDev = import.meta.env.DEV
const SkinTester = isDev
  ? defineAsyncComponent(() => import('./dev/SkinTester.vue'))
  : null

if (isDev) {
  import('./dev/useMockPeers').then(({ startMockPeers }) => startMockPeers())
}

const settingsStore = useSettingsStore()

useMonitor()
useActivityScore()
useStepCounter()
useSocial()
useSkinStore()
useTrayIcon()

const currentWindow = getCurrentWindow()
const isSocialWindow = currentWindow.label === 'social'

if (isSocialWindow) {
  onMounted(() => {
    currentWindow.onCloseRequested(async (event) => {
      event.preventDefault()
      await currentWindow.hide()
    })
  })
}

const showTooltip = ref(false)
const showTester = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

function onPetEnter() {
  hoverTimer = setTimeout(() => {
    showTooltip.value = true
  }, 300)
}

function onPetLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
  showTooltip.value = false
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (!isDev || isSocialWindow) return
  if (e.key === 't' || e.key === 'T') {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      showTester.value = !showTester.value
    }
  }
}

function onStorageChange(e: StorageEvent) {
  if (e.key === 'desk-pet-skin' && e.newValue) {
    settingsStore.syncSkinId(e.newValue)
  }
}

onMounted(() => {
  window.addEventListener('storage', onStorageChange)
  if (isDev) window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorageChange)
  if (hoverTimer) clearTimeout(hoverTimer)
  if (isDev) window.removeEventListener('keydown', onGlobalKeydown)
})

async function onPetClick() {
  showTooltip.value = false
  if (hoverTimer) clearTimeout(hoverTimer)

  const social = await WebviewWindow.getByLabel('social')
  if (social) {
    const visible = await social.isVisible()
    if (visible) {
      await social.hide()
    } else {
      await social.show()
      await social.setFocus()
    }
  }
}
</script>

<template>
  <!-- Social window -->
  <SocialPanel v-if="isSocialWindow" />

  <!-- Pet window -->
  <div v-else class="pet-app">
    <div class="pet-zone">
      <Transition name="tooltip">
        <StepDisplay v-if="showTooltip" class="step-tooltip" />
      </Transition>
      <PeerOverlay>
        <PetCanvas
          @click="onPetClick"
          @mouseenter="onPetEnter"
          @mouseleave="onPetLeave"
        />
      </PeerOverlay>
    </div>
    <component v-if="showTester && SkinTester" :is="SkinTester" />
  </div>
</template>

<style scoped>
.pet-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 4px;
  background: transparent;
}

.pet-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-tooltip {
  position: absolute;
  bottom: 100%;
  margin-bottom: 0;
  z-index: 10;
  pointer-events: none;
}

.tooltip-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tooltip-leave-active {
  transition: all 0.12s ease-in;
}
.tooltip-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.92);
}
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(3px) scale(0.95);
}
</style>

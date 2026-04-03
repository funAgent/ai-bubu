<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { usePetStore } from '@/stores/pet'
import PetRenderer from './PetRenderer.vue'

const emit = defineEmits<{
  click: []
}>()

const petStore = usePetStore()
const pressing = ref(false)

let dragTimer: ReturnType<typeof setTimeout> | null = null
let cleanupTimer: ReturnType<typeof setTimeout> | null = null
let isClick = true

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isClick = true
  pressing.value = true

  dragTimer = setTimeout(async () => {
    isClick = false
    pressing.value = false
    petStore.isDragging = true
    try {
      const appWindow = getCurrentWindow()
      await appWindow.startDragging()
    } finally {
      petStore.isDragging = false
    }
  }, 150)
}

function onMouseUp() {
  pressing.value = false
  if (dragTimer) {
    clearTimeout(dragTimer)
    dragTimer = null
  }
  if (isClick) {
    emit('click')
  }
  cleanupTimer = setTimeout(() => {
    petStore.isDragging = false
  }, 50)
}

function onMouseLeave() {
  pressing.value = false
  if (dragTimer) {
    clearTimeout(dragTimer)
    dragTimer = null
  }
  if (cleanupTimer) {
    clearTimeout(cleanupTimer)
    cleanupTimer = null
  }
  isClick = false
}

onUnmounted(() => {
  if (dragTimer) clearTimeout(dragTimer)
  if (cleanupTimer) clearTimeout(cleanupTimer)
})
</script>

<template>
  <div
    class="pet-canvas"
    :class="{ pressing }"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
  >
    <PetRenderer />
  </div>
</template>

<style scoped>
.pet-canvas {
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2px;
  transition:
    transform 0.1s ease,
    opacity 0.1s ease;
}
.pet-canvas.pressing {
  transform: scale(0.96);
  opacity: 0.85;
}
.pet-canvas:active {
  cursor: grabbing;
}
</style>

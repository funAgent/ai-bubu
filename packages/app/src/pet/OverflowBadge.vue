<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PeerInfo } from '@/types'
import { useI18n } from '@/composables/useI18n'

const { t, isZh } = useI18n()

const props = defineProps<{
  count: number
  peers: PeerInfo[]
  side: 'left' | 'right'
}>()

const hovered = ref(false)

const label = computed(() => (isZh.value ? `+${props.count}人` : `+${props.count}`))

const tooltipLines = computed(() =>
  props.peers.map((p) => {
    const name = p.nickname || t('lbSelf')
    const steps = p.dailySteps.toLocaleString()
    return isZh.value ? `${name}  ${steps}步` : `${name} — ${steps} steps`
  }),
)

const tooltipStyle = computed(() =>
  props.side === 'left' ? { right: '0', left: 'auto' } : { left: '0', right: 'auto' },
)
</script>

<template>
  <div class="overflow-badge" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <span class="badge-label">{{ label }}</span>
    <Transition name="fade">
      <div v-if="hovered" class="overflow-tooltip" :style="tooltipStyle">
        <div v-for="(line, idx) in tooltipLines" :key="idx" class="tooltip-row">
          {{ line }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.overflow-badge {
  position: relative;
  display: flex;
  align-items: center;
  cursor: default;
  flex-shrink: 0;
}

.badge-label {
  font-size: 10px;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.7);
  border-radius: 8px;
  padding: 1px 5px;
  white-space: nowrap;
  user-select: none;
}

.overflow-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 6px;
  padding: 4px 8px;
  min-width: 100px;
  max-height: 140px;
  overflow-y: auto;
  z-index: 100;
}

.tooltip-row {
  font-size: 10px;
  color: #cbd5e1;
  white-space: nowrap;
  line-height: 1.6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { usePetStore } from '../stores/pet'
import { getScoreColor } from '../utils/activity'
import { useI18n } from '../composables/useI18n'

const petStore = usePetStore()
const { t } = useI18n()

const scoreBarWidth = computed(() => `${Math.min(100, petStore.activityScore)}%`)
const scoreColor = computed(() => getScoreColor(petStore.activityScore))
const stateKeys: Record<string, string> = {
  idle: 'stateIdle', walk: 'stateWalk', run: 'stateRun', sprint: 'stateSprint',
}
const movementLabel = computed(() => t(stateKeys[petStore.movementState] || 'stateIdle'))

const milestone = ref('')
const showMilestone = ref(false)

const MILESTONES = [50000, 20000, 10000, 5000, 2000, 1000]

let milestoneTimer: ReturnType<typeof setTimeout> | null = null

watch(() => petStore.dailySteps, (newVal, oldVal) => {
  for (const m of MILESTONES) {
    if (newVal >= m && oldVal < m) {
      milestone.value = `${m.toLocaleString()}${t('steps')}!`
      showMilestone.value = true
      if (milestoneTimer) clearTimeout(milestoneTimer)
      milestoneTimer = setTimeout(() => { showMilestone.value = false }, 3000)
      break
    }
  }
})

onUnmounted(() => {
  if (milestoneTimer) clearTimeout(milestoneTimer)
})
</script>

<template>
  <div class="step-tooltip-card">
    <div class="step-row">
      <span class="step-number">{{ petStore.formattedSteps }}</span>
      <span class="step-unit">{{ t('steps') }}</span>
    </div>
    <div class="movement-label">{{ movementLabel }}</div>
    <div class="score-bar">
      <div class="score-fill" :style="{ width: scoreBarWidth, background: scoreColor }" />
    </div>
    <Transition name="milestone">
      <div v-if="showMilestone" class="milestone-badge">
        {{ milestone }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.step-tooltip-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(30, 32, 48, 0.85);
  padding: 6px 10px 5px;
  border-radius: 8px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.step-tooltip-card::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 6px;
  height: 6px;
  background: rgba(30, 32, 48, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.step-row {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.step-number {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.step-unit {
  font-size: 9px;
  color: #64748b;
}

.movement-label {
  font-size: 9px;
  color: #94a3b8;
  letter-spacing: 0.3px;
}

.score-bar {
  width: 60px;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 1px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 1px;
  transition: width 0.6s ease, background 0.6s ease;
}

.milestone-badge {
  position: absolute;
  top: -24px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1a1b2e;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
}

.milestone-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.milestone-leave-active {
  transition: all 0.3s ease-in;
}
.milestone-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.85);
}
.milestone-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.9);
}
</style>

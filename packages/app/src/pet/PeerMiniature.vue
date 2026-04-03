<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import type { PeerInfo, SkinManifest } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { useSkinStore } from '@/stores/skin'
import { resolveAnimation } from '@/utils/skin'
import { MOVEMENT_STATE_KEYS } from '@/utils/movement'
import SpriteRenderer from './renderers/SpriteRenderer.vue'
import ImageRenderer from './renderers/ImageRenderer.vue'

const { t } = useI18n()
const skinStore = useSkinStore()

const props = defineProps<{
  peer: PeerInfo
  scale: number
}>()

const manifest = ref<SkinManifest | null>(null)
const loadFailed = ref(false)
const hovered = ref(false)

const skinBasePath = computed(() => `/skins/${props.peer.petSkin}/`)

const currentAnimation = computed(() => {
  if (!manifest.value) return null
  const result = resolveAnimation(props.peer.movementState, manifest.value)
  if (!result) return null
  return { ...result, src: skinBasePath.value + result.config.file }
})

const baseSize = computed(() => manifest.value?.size ?? { width: 48, height: 48 })

const rendererStyle = computed(() => {
  const w = Math.round(baseSize.value.width * props.scale)
  const h = Math.round(baseSize.value.height * props.scale)
  return { width: `${w}px`, height: `${h}px` }
})

const initial = computed(() => (props.peer.nickname || '?').charAt(0))

const capsuleSize = computed(() => {
  const s = Math.round(32 * props.scale)
  return {
    width: `${s}px`,
    height: `${s}px`,
    fontSize: `${Math.max(9, Math.round(11 * props.scale))}px`,
  }
})

const tooltipText = computed(() => {
  const name = props.peer.nickname || t('lbSelf')
  const steps = props.peer.dailySteps.toLocaleString()
  const state = t(MOVEMENT_STATE_KEYS[props.peer.movementState])
  return { name, steps, state }
})

const peerEl = ref<HTMLElement | null>(null)
const tipOffset = ref('translateX(-50%)')

function updateTipPosition() {
  if (!peerEl.value) return
  const rect = peerEl.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const winW = window.innerWidth
  const margin = 60
  if (centerX < margin) {
    tipOffset.value = 'translateX(-10%)'
  } else if (centerX > winW - margin) {
    tipOffset.value = 'translateX(-90%)'
  } else {
    tipOffset.value = 'translateX(-50%)'
  }
  hovered.value = true
}

function onEnter() {
  updateTipPosition()
}

function onLeave() {
  hovered.value = false
}

async function loadManifest(skinId: string) {
  if (!skinId || !skinStore.isBuiltin(skinId)) {
    loadFailed.value = true
    return
  }
  try {
    const resp = await fetch(`/skins/${skinId}/skin.json`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const m: SkinManifest = await resp.json()
    m.id = skinId
    manifest.value = m
    loadFailed.value = false
  } catch {
    loadFailed.value = true
  }
}

watch(
  () => props.peer.petSkin,
  (id) => loadManifest(id),
  { immediate: false },
)
onMounted(() => loadManifest(props.peer.petSkin))
</script>

<template>
  <div ref="peerEl" class="peer-mini" @mouseenter="onEnter" @mouseleave="onLeave">
    <!-- sprite 动画渲染 -->
    <div v-if="currentAnimation && !loadFailed" class="peer-sprite-wrap" :style="rendererStyle">
      <SpriteRenderer
        v-if="manifest?.format === 'sprite' && currentAnimation.config.sprite"
        :src="currentAnimation.src"
        :frame-width="currentAnimation.config.sprite.frameWidth"
        :frame-height="currentAnimation.config.sprite.frameHeight"
        :frame-count="currentAnimation.config.sprite.frameCount"
        :columns="currentAnimation.config.sprite.columns"
        :fps="currentAnimation.config.sprite.fps"
        :start-frame="currentAnimation.config.sprite.startFrame ?? 0"
        :loop="currentAnimation.config.loop"
      />
      <ImageRenderer v-else :src="currentAnimation.src" />
    </div>

    <!-- 非内置皮肤 fallback: 圆形首字母 -->
    <div v-else class="peer-capsule" :style="capsuleSize">
      <span class="peer-initial">{{ initial }}</span>
    </div>

    <!-- hover tooltip -->
    <Transition name="tip">
      <div v-if="hovered" class="peer-tip" :style="{ transform: tipOffset }">
        <div class="tip-name">{{ tooltipText.name }}</div>
        <div class="tip-detail">
          <span class="tip-steps">{{ tooltipText.steps }}{{ t('steps') }}</span>
          <span class="tip-state">{{ tooltipText.state }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.peer-mini {
  position: relative;
  opacity: 0.85;
  transition:
    opacity 0.2s,
    transform 0.2s;
  flex-shrink: 0;
  cursor: default;
}
.peer-mini:hover {
  opacity: 1;
  transform: scale(1.12);
}

.peer-sprite-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: pixelated;
}

.peer-capsule {
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.peer-initial {
  color: #f1f5f9;
  font-weight: 700;
  line-height: 1;
  user-select: none;
}

/* tooltip */
.peer-tip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 5px;
  padding: 3px 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.tip-name {
  font-size: 9px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 1px;
}

.tip-detail {
  display: flex;
  gap: 4px;
  font-size: 8px;
}

.tip-steps {
  color: #a78bfa;
  font-weight: 500;
}

.tip-state {
  color: #94a3b8;
}

.tip-enter-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tip-leave-active {
  transition: all 0.08s ease-in;
}
.tip-enter-from {
  opacity: 0;
}
.tip-leave-to {
  opacity: 0;
}
</style>

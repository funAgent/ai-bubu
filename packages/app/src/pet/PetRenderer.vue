<script setup lang="ts">
import { computed } from 'vue'
import { useSkinStore } from '@/stores/skin'
import { usePetStore } from '@/stores/pet'
import SpriteRenderer from './renderers/SpriteRenderer.vue'
import LottieRenderer from './renderers/LottieRenderer.vue'
import ImageRenderer from './renderers/ImageRenderer.vue'

const skinStore = useSkinStore()
const petStore = usePetStore()

const currentAnimation = computed(() => skinStore.getAnimationForState(petStore.movementState))

const isIdle = computed(() => petStore.movementState === 'idle')

const rendererStyle = computed(() => ({
  width: `${skinStore.currentManifest.size.width}px`,
  height: `${skinStore.currentManifest.size.height}px`,
}))
</script>

<template>
  <div class="pet-renderer" :class="{ breathing: isIdle }" :style="rendererStyle">
    <template v-if="currentAnimation">
      <SpriteRenderer
        v-if="skinStore.currentManifest.format === 'sprite'"
        :src="currentAnimation.src"
        :frame-width="currentAnimation.config.sprite?.frameWidth ?? 128"
        :frame-height="currentAnimation.config.sprite?.frameHeight ?? 128"
        :frame-count="currentAnimation.config.sprite?.frameCount ?? 1"
        :columns="currentAnimation.config.sprite?.columns ?? 1"
        :fps="currentAnimation.config.sprite?.fps ?? 8"
        :start-frame="currentAnimation.config.sprite?.startFrame ?? 0"
        :loop="currentAnimation.config.loop"
      />

      <LottieRenderer
        v-else-if="skinStore.currentManifest.format === 'lottie'"
        :src="currentAnimation.src"
        :loop="currentAnimation.config.loop"
      />

      <ImageRenderer v-else :src="currentAnimation.src" />
    </template>
  </div>
</template>

<style scoped>
.pet-renderer {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pet-renderer.breathing {
  animation: breathe 2.5s ease-in-out infinite;
  will-change: transform;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps<{
  src: string
}>()

const isSvg = computed(() => props.src.endsWith('.svg'))
const svgContent = ref('')

const SVG_PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: ['script', 'foreignObject', 'style'],
  FORBID_ATTR: ['xlink:href'],
}

async function loadSvg(src: string) {
  try {
    const resp = await fetch(src)
    if (resp.ok) {
      const raw = await resp.text()
      svgContent.value = DOMPurify.sanitize(raw, SVG_PURIFY_CONFIG)
    }
  } catch (err) {
    console.error('Failed to load SVG:', err)
    svgContent.value = ''
  }
}

watch(
  () => props.src,
  (newSrc) => {
    if (isSvg.value) {
      loadSvg(newSrc)
    } else {
      svgContent.value = ''
    }
  },
)

onMounted(() => {
  if (isSvg.value) loadSvg(props.src)
})
</script>

<template>
  <div v-if="isSvg && svgContent" v-html="svgContent" class="image-renderer svg-inline" />
  <img v-else-if="!isSvg" :src="src" class="image-renderer" alt="pet" />
</template>

<style scoped>
.image-renderer {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.svg-inline :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>

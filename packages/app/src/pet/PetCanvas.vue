<script setup lang="ts">
import PetRenderer from './PetRenderer.vue'
</script>

<template>
  <div class="pet-canvas">
    <PetRenderer />
  </div>
</template>

<style scoped>
.pet-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2px;
}
</style>

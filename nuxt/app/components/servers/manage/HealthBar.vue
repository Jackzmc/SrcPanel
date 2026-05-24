<template>
  <div class="flex gap-0">
    <UProgress :modelValue="healthbar.perm.value" :min="0" :max="healthbar.perm.value" :color="color as any"
      animation="elastic" class="rounded-none p-0 m-0 w-20"
      :style="{ width: `${permWidth}%` }"
    />
    <!-- Width of both + perm width == 100 -->
    <template v-if="healthbar.temp">
      <!-- Always full, but width is based on how much temp health -->
      <UProgress v-if="healthbar.temp.value > 0" :modelValue="100" :min="0" :max="100" :color="color as any"
        animation="elastic" class="rounded-none p-0 m-0 opacity-50 temp-health"
        :style="{ width: `${tempWidth}%` }"
      />
      <!-- Always empty, fills remaining space without temp-health styling -->
      <UProgress :modelValue="0" :min="0" :max="100"
      animation="elastic" class="rounded-none p-0 m-0 opacity-25 "
      :style="{ width: `${tempEmptyWidth}%` }"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { HealthBar } from '#shared/types/server'

const props = defineProps<{
  healthbar: HealthBar
}>()


const permWidth = computed(() => {
  if(props.healthbar.perm.value === 0) return 100.0
  return Math.ceil(props.healthbar.perm.value / props.healthbar.perm.max * 100)
})
const tempWidth = computed(() => 100.0 - permWidth.value)
const tempEmptyWidth = computed(() => 100.0 - permWidth.value - tempWidth.value)

const color = computed(() => {
  const perc = (props.healthbar.perm.value / props.healthbar.perm.max) * 100
  if(perc <= 10.0) return "error"
  if(perc <= 30.0) return "warning"
  return "success"
})
</script>


<style>
.temp-health {
  height: 100%;
  width: 100%;
  background: #4caf50;
  border-radius: 10px;
  position: relative;
}
.temp-health::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0px,
    transparent 8px,
    #000 11px,
    #000 14px
  );
  background-size: 20px 100%; /* Every 10px creates a 2px wide tick */
  pointer-events: none;
  z-index: 2;
  opacity: 0.75;
}

</style>

<template>
<span ref="elem">
  <img v-if="loadState == LoadState.Loading || (loadState == LoadState.Error && !props.errorSrc)" :class="imgClass" :src="props.placeholderSrc">
  <img v-else-if="loadState == LoadState.Error && props.errorSrc" :class="imgClass" :src="props.errorSrc" loading="lazy">
  <img ref="image" fetchpriority="low"
    v-show="loadState == LoadState.Success" v-if="startLoading && loadState != LoadState.Error"
    :class="imgClass" :src="props.src"
    @error="loadState = LoadState.Error"
  >
</span>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import { ref, onMounted, onUnmounted, watch } from 'vue';
const props = defineProps<{
  src: string,
  placeholderSrc: string,
  errorSrc?: string,
  imgClass?: string,
  observer?: boolean
}>()
const elem = ref()
let image = ref()
const startLoading = ref(false)
let loadState = ref<LoadState>(LoadState.Loading)
let observer: IntersectionObserver

watch(() => image.value?.complete, () => {
  loadState.value = LoadState.Success
})

onMounted(() => {
  startLoading.value = !Boolean(props.observer)
  if(props.observer) {
    observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if(entry.isIntersecting) {
        startLoading.value = true
        observer.disconnect()
      }
    }, {
      rootMargin: "0px",
      threshold: 0.2,
    });
    observer.observe(elem.value)
  }
})
onUnmounted(() => {
  if(observer) observer.disconnect()
})
</script>

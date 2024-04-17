<template>
<span ref="elem">
  <img v-if="loadState == LoadState.Loading || (loadState == LoadState.Error && !props.errorSrc)" :class="imgClass" :src="props.placeholderSrc">
  <img v-else-if="loadState == LoadState.Error && props.errorSrc" :class="imgClass" :src="props.errorSrc" loading="lazy">
  <img fetchpriority="low" v-show="loadState == LoadState.Success" :class="imgClass" :src="props.src" loading="lazy" v-if="startLoading && loadState != LoadState.Error"
    @load="loadState = LoadState.Success" @error="loadState = LoadState.Error"
  >
</span>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import { ref, onMounted, onUnmounted } from 'vue';
const props = defineProps<{
  src: string,
  placeholderSrc: string,
  errorSrc?: string,
  imgClass?: string,
  observer?: boolean
}>()
const elem = ref()
const startLoading = ref(false)
let loadState = ref<LoadState>(LoadState.Loading)
let observer: IntersectionObserver
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

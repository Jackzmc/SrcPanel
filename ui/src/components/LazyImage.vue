<template>
<span ref="elem">
  <img v-if="loadState == LoadState.Loading || (loadState == LoadState.Error && !props.errorSrc)"
    alt="Loading image" :class="imgClass" :src="props.placeholderSrc">
  <img v-else-if="loadState == LoadState.Error && props.errorSrc"
    alt="Failed to load image" :class="imgClass" :src="props.errorSrc" loading="lazy">
  <img v-show="loadState === LoadState.Success" v-if="startLoading && loadState != LoadState.Error && props.src"
    ref="image"
    fetchpriority="low"
    :alt="alt" :class="imgClass"
    :src="props.src" @load="onLoad"
    @error="loadState = LoadState.Error"
  >
</span>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import { ref, onMounted, onUnmounted, watch } from 'vue';
const props = defineProps<{
  alt?: string
  src?: string | null,
  placeholderSrc: string,
  errorSrc?: string,
  imgClass?: string,
  observer?: boolean
}>()
const elem = ref()
let image = ref()
const startLoading = ref(false)
let loadState = ref<LoadState>(LoadState.Loading)
let viewObserver: IntersectionObserver|undefined = undefined

onMounted(() => {
  startLoading.value = !props.observer
  if(props.observer) {
    viewObserver = new IntersectionObserver((entries) => {
      const [entry] = entries
      if(entry.isIntersecting) {
        startLoading.value = true
        viewObserver!.disconnect()
      }
    }, {
      rootMargin: "0px",
      threshold: 0.2,
    });
    viewObserver.observe(elem.value)
  }
})

function onLoad() {
  if(image.value?.complete && loadState.value == LoadState.Loading)
    loadState.value = LoadState.Success
}

onUnmounted(() => {
  if(viewObserver) viewObserver.disconnect()
})
</script>

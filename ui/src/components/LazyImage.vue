<template>
<span>
  <img v-if="loadState == LoadState.Loading || (loadState == LoadState.Error && !props.errorSrc)" :class="imgClass" :src="props.placeholderSrc">
  <img v-else-if="loadState == LoadState.Error && props.errorSrc" :class="imgClass" :src="props.errorSrc" loading="lazy">
  <img v-show="loadState == LoadState.Success" :class="imgClass" :src="props.src" loading="lazy"
    @load="loadState = LoadState.Success" @error="loadState = LoadState.Error"
  >
</span>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import { ref } from 'vue';
const props = defineProps<{
  src: string,
  placeholderSrc: string,
  errorSrc?: string,
  imgClass?: string
}>()
let loadState = ref<LoadState>(LoadState.Loading)

</script>

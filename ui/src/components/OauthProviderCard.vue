<template>
<div class="list-item">
  <div class="list-item-image">
    <figure class="image is-48x48">
      <img class="is-rounded" :src="imageUrl" />
    </figure>
  </div>
  <div class="list-item-content">
    <div class="list-item-title">
      {{ data?.username }}
    </div>
    <div class="list-item-description has-text-black">
      {{ provider }}
    </div>
  </div>

  <div class="list-item-controls">
    <div class="buttons is-right">
      <slot :provider="provider" :data="data">

      </slot>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { OauthProviderData } from '../../../common-types/User.js';
import { computed } from 'vue';

const props = defineProps<{
  provider: string,
  data?: OauthProviderData
  providerImageSrc: string,
}>()

const imageUrl = computed(() => {
  return props.data?.avatarUrl ?? props.providerImageSrc
})
</script>

<template>
<div class="list-item">
  <div class="list-item-image">
    <figure class="image is-48x48">
      <img class="is-rounded" :src="imageUrl" />
    </figure>
  </div>
  <div class="list-item-content">
    <div class="list-item-title has-text-danger" v-if="provider.expired">
      Link has expired, please relogin.
    </div>
    <div class="list-item-title" v-else>
      {{ provider.data?.username }}
    </div>
    <div class="list-item-description has-text-black">
      {{ provider.name }}
    </div>
  </div>

  <div class="list-item-controls">
    <div class="buttons is-right">
      <slot :provider="provider" :data="provider.data">

      </slot>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ProviderConnectionData } from '../../../common-types/User.js';
import { computed } from 'vue';

const props = defineProps<{
  provider: ProviderConnectionData
  providerImageSrc: string,
}>()

const imageUrl = computed(() => {
  return props.provider.data?.avatarUrl ?? props.providerImageSrc
})
</script>

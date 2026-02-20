<template>
<ListItem>
  <template #image>
    <figure class="image is-48x48">
      <img class="is-rounded" :src="imageUrl" />
    </figure>
  </template>
  <template #content>
    <div class="list-item-title">
      {{ provider.name }}
    </div>
    <div v-if="provider.expired" class="list-item-description has-text-danger">
      Link has expired, please relogin.
    </div>
    <div v-else-if="provider.enabled" class="list-item-description">
      {{ provider.data?.username }}
    </div>
    <div v-else class="list-item-description">
      <em>Not Linked</em>
    </div>
  </template>
  <template #controls>
    <div class="buttons is-right">
      <slot :provider="provider" :data="provider.data">

      </slot>
    </div>
  </template>

</ListItem>
</template>

<script setup lang="ts">
import { ProviderConnectionData } from '../../../../common-types/User.js';
import { computed } from 'vue';
import ListItem from '@/components/ListItem.vue';

const props = defineProps<{
  provider: ProviderConnectionData
  providerImageSrc: string,
}>()

const imageUrl = computed(() => {
  return props.provider.data?.avatarUrl ?? props.providerImageSrc
})
</script>

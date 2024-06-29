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
    <div class="list-item-description has-text-danger" v-if="provider.expired">
      Link has expired, please relogin.
    </div>
    <div class="list-item-description" v-else-if="provider.enabled">
      {{ provider.data?.username }}
    </div>
    <div class="list-item-description" v-else>
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

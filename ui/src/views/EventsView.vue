<template>
  <div class="container">
    Events.
    <a v-for="event in events" :key="event.id">
      {{ event.name }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import { APIEvent } from '../../../common-types/Event.js';
import { request } from '@/js/util.js';

let events = ref<APIEvent[]>()

async function getEvents() {
  const response = await request("/api/events")
  if(response?.ok) {
    events.value = await response.json()
  }
}

onBeforeMount(() => {
  getEvents()
})
</script>

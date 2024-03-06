<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="box"  v-for="event in events" :key="event.id">
        <router-link :data-tooltip="event.creator.id" :to="{ name: 'manage-user', params: { id: event.creator.id }, query: { returnTo: $route.fullPath }}">
          <figure class="image is-32x32 is-inline-block">
            <img class="is-rounded" :src="event.creator.avatarUrl">
          </figure>
          <p class="is-inline is-size-5 mt-0 ml-1" style="top:-8px;position:relative">{{ event.creator.name }}</p>
        </router-link>
        <h4 class="title is-4">
          <router-link :to="{ name: 'event-details', params: { id: event.id, title: event.name.toLocaleLowerCase().replace(/\s/g,'-').replace(/[^a-zA-Z0-9\-]/g,'') } }">
          {{ event.name }}
          </router-link>
        </h4>
        <p class="subtitle">{{ event.description }}</p>
      </div>
    </div>
  </div>

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
    events.value = (await response.json()).events
  }
}

onBeforeMount(() => {
  getEvents()
})
</script>

<template>
<div>
  <section class="hero is-info has-text-centered is-small">
    <div class="hero-body pb-5">
      <!-- <p class="title has-text-white">
        Search
      </p> -->
      <p class="subtitle has-text-white">
        Showing results for <b>{{ query }}</b>
      </p>
    </div>
  </section>

  <div class="container">
    <div class="mt-4 has-text-centered">
      <h4 class="title is-4">Players</h4>
      <div class="column is-6">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              <FormatText text="STEAM_1:0:49243767"></FormatText>
            </p>
            <button class="card-header-icon" aria-label="more options">
              <span class="icon">
                <i class="fas fa-angle-down" aria-hidden="true"></i>
              </span>
            </button>
          </header>
        </div>
      </div>
      <hr>

      <h4 class="title is-4">Notes</h4>
      <div class="column is-6">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              Note #2335
            </p>
            <button class="card-header-icon" aria-label="more options">
              <span class="icon">
                <i class="fas fa-angle-down" aria-hidden="true"></i>
              </span>
            </button>
          </header>
        </div>
      </div>
      <hr>

      <h4 class="title is-4">Pages</h4>
      <div class="column is-6">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              <Icon icon="star">Commands</Icon>
            </p>
            <button class="card-header-icon" aria-label="more options">
              <span class="icon">
                <i class="fas fa-angle-down" aria-hidden="true"></i>
              </span>
            </button>
          </header>
        </div>
      </div>
      <div class="column is-6" v-for="route in filteredRoutes">
        <div class="card">
          <header class="card-header">
            <p class="card-header-title">
              <Icon icon="star">{{ route.name }}</Icon>
            </p>
            <button class="card-header-icon" aria-label="more options">
              <span class="icon">
                <i class="fas fa-angle-down" aria-hidden="true"></i>
              </span>
            </button>
          </header>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import FormatText from '@/components/FormatText.vue';
import UserComponent from '@/components/UserComponent.vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute()
const router = useRouter()

const query = computed(() => {
  const q = route.query.q as string|null
  if(!q) return ""
  return q.trim().toLocaleLowerCase()
})

interface RouteMeta {
  keywords?: string[],
  description?: string
}


const routes = router.getRoutes()

const filteredRoutes = computed(() => {
  return routes
    .filter(route => {
      const meta = route.meta as RouteMeta
      return route.name?.toString().toLocaleLowerCase().includes(query.value)
        || meta.description?.toLocaleLowerCase().includes(query.value)
        || meta.keywords?.includes(query.value)
    })
})
</script>

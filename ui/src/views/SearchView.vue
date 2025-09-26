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
      <template v-if="userResults.length > 0">
        <h4 class="title is-4">Players</h4>
        <div class="column is-6" v-for="user in userResults" :key="user.steamid">
          <div class="card">
            <header class="card-header">
              <p class="card-header-title">
                <UserComponent :user="user" />
              </p>
            </header>
          </div>
        </div>
        <hr>
      </template>

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

      <template v-if="filteredRoutes.length > 0">
      <h4 class="title is-4">Pages</h4>
      <div class="columns is-multiline">
        <router-link  v-for="route in filteredRoutes" :to="route.path" class="column is-6">
          <div class="card">
            <header class="card-header">
              <NavBarLabel :route="route" class="card-header-title"  />
            </header>
            <div class="card-content has-text-left">
              <p>{{ route.meta.description }}</p>
              <p><code>{{ route.path }}</code></p>
            </div>
          </div>
        </router-link>
      </div>
    </template>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import FormatText from '@/components/FormatText.vue';
import NavBarItem from '@/components/nav/NavBarItem.vue';
import NavBarLabel from '@/components/nav/NavBarLabel.vue';
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

const URL_PARAM_REGEX = new RegExp(/:([a-zA-Z0-9-_]+)\??/g)

const filteredRoutes = computed(() => {
  return routes
    .filter(route => {
      const meta = route.meta as RouteMeta
      // Hide unsearchable routes
      if(route.meta?.searchable === false) return false

      const params = [...route.path.matchAll(URL_PARAM_REGEX)]
        // ignore if param is optional
        .filter(param => !param[0].endsWith("?"))
      if(params.length > 0) {
        console.warn("Route", route.name, route.path, "has unsupported required parameters and is not marked", "searchable=false", "-- skipping")
        return false
      }

      const name = route.meta?.nav?.labelText ?? route.meta?.title ?? route.name?.toString() ?? route.path

      return name.toLocaleLowerCase().includes(query.value)
        || route.path.includes(query.value)
        || meta.description?.toLocaleLowerCase().includes(query.value)
        || meta.keywords?.includes(query.value)
    })
    .map(route => {
      // Change path to match external links
      if(route.redirect && route.meta?.nav?.isExternalLink) {
        console.debug(route.name, route.redirect, route.meta.nav.isExternalLink)
        route.path = route.redirect.toString()
      }

      return route
    })
})

const userResults = computed(() => {
  return [
    {
      steamid: "STEAM_1:0:49243767",
      name: "Jackzie ❤"
    }
  ]
})

const objResults = computed(() => {
  return [
    {
      type: "note",
      note: {
        id: 23523,
        creator: {
          steamid: "STEAM_1:0:49243767",
          name: "Jackzie ❤"
        },
        target: {
          steamid: "STEAM_1:0:49243767",
          name: "Jackzie ❤"
        },
        content: "Penis"
      }
    },
    {
      type: "ban",
      ban: {
        id: 23523,
        client: {
          steamid: "STEAM_1:0:49243767",
          name: "Jackzie ❤"
        },
        executor: {
          steamid: "STEAM_1:0:49243767",
          name: "Jackzie ❤"
        },
        reason: "Penis"
      }
    }
  ]
})

</script>

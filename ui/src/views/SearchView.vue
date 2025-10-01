<template>
<div>
  <section class="hero is-info has-text-centered is-small">
    <div class="hero-body pb-5">
      <!-- <p class="title has-text-white">
        Search
      </p> -->
      <p class="subtitle has-text-white">
        Showing <b>{{ resultCount }}</b> results for <b>{{ query }}</b>
      </p>
      <p class="subtitle has-text-white">
        Took <b>{{ elapsedTime }}</b>
      </p>
    </div>
  </section>

  <div class="container">
    <div class="mt-4">
      <h4 class="title is-4 has-text-centered">Objects</h4>
      <div class="grid is-col-min-12 is-multiline">
        <div :class="['cell',{'is-col-span-2': result.type == 'activity_log'}]" v-for="(result, id) of results" :key="id">
          <div :class="['card', result.type]" style="height:100%" >
            <header class="card-header">
              <p class="card-header-title mb-0">
                <template v-if="result.userData">
                  <UserComponent :user="result.userData" />
                </template>
                <template v-else>
                  <Icon v-if="RESULT_TYPE[result.type].icon" :icon="RESULT_TYPE[result.type].icon">
                    {{ RESULT_TYPE[result.type].title }} #{{ id }}
                  </Icon>
                  <span v-else>{{ RESULT_TYPE[result.type].title }} #{{ id }}</span>
              </template>
              </p>
            </header>
            <div class="card-content">
              <template v-if="result.data">
                <LogMessage v-if="'logData' in result" :log="result.logData" :priv-user="privUser" />
                <div class="content" v-else-if="result.type === 'discuss'">
                  <h5 class="">{{ result.data.title }}</h5>
                  <p class="subtitle"><FormatText :text="result.data.description" /></p>
                </div>
                <div class="content" v-else-if="result.type === 'user'">
                  <table class='table is-fullwidth'>
                    <tr>
                      <th>Joined</th>
                      <td>{{ formatDate(result.data.create_time) }}</td>
                    </tr>
                    <tr>
                      <th>Last Seen</th>
                      <td>{{ formatDate(result.data.create_time) }}</td>
                    </tr>
                    <tr>
                      <th>Last Location</th>
                      <td v-if="result.data.last_region">{{ result.data.last_region }}, {{  result.data.last_country }}</td>
                      <td v-else>{{ result.data.last_country }}</td>
                    </tr>
                    <tr>
                      <th>Last IP</th>
                      <td>{{ result.data.last_ip }}</td>
                    </tr>
                  </table>
                </div>
                <!-- TODO: UI for: events, notes, bans, -->
                <pre v-else>{{ result.data }}</pre>
              </template>
              <template v-else>
                <span>{{ result.partialContent }}</span>
                <div class="block pt-2">
                  <Icon v-if="!result.data"  icon="fa-spinner" spin>Waiting for full result</Icon>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <hr>

      <template v-if="filteredRoutes.length > 0">
      <h4 class="title is-4 has-text-centered">Pages</h4>
      <div class="columns is-multiline">
        <router-link v-for="pgRoute in filteredRoutes" :key="pgRoute.path" :to="pgRoute.path" class="column is-6">
          <div class="card">
            <header class="card-header">
              <NavBarLabel :route="pgRoute" class="card-header-title"  />
            </header>
            <div class="card-content has-text-left">
              <p>{{ pgRoute.meta.description }}</p>
              <p><code>{{ pgRoute.path }}</code></p>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { APISearchDetailResult, APISearchPartialResults, SearchType } from '../../../common-types/Search';
import { APIUser } from '../../../common-types/User.js';
import SteamID from 'steamid';
import LogMessage from '@/components/LogMessage.vue';
import { PrivilegedUser } from '@/js/User.js';
import { APILogData } from '../../../common-types/Logs.js';
import { formatDate } from '@/js/util.js';

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  privUser?: PrivilegedUser
}>()

const query = computed(() => {
  const q = route.query.q as string|null
  if(!q) return ""
  return q.trim().toLocaleLowerCase()
})

const RESULT_TYPE: Record<SearchType, { icon?: string, title: string }> = {
  activity_log: {
    icon: "list",
    title: "Activity Log"
  },
  user: {
    icon: "fa-user",
    title: "Player"
  },
  note: {
    icon: "sticky-note",
    title: "Note"
  },
  ban: {
    icon: "gravel",
    title: "Ban"
  },
  discuss: {
    icon: "message",
    title: "Discussion"
  },
  event: {
    icon: "calendar",
    title: "Event"
  }
}

interface SearchResultData {
  type: SearchType,
  partialContent: string|null,
  data: Record<string, any>|null,
  // Custom parsed data for some objects
  userData?: APIUser,
  logData?: APILogData
}

const resultMetrics = ref<{ startTime?: number, endTime?: number }>({})
const results = ref<Record<string, SearchResultData>|null>(null) // key is result's obj ID

const routes = router.getRoutes()

const URL_PARAM_REGEX = new RegExp(/:([a-zA-Z0-9-_]+)\??/g)

const resultCount = computed(() => {
  return results.value ? Object.keys(results.value).length : 0
})

const elapsedTime = computed(() => {
  if(!resultMetrics.value.endTime || !resultMetrics.value.startTime) return null
  const msDiff = resultMetrics.value.endTime - resultMetrics.value.startTime
  if(msDiff > 1000) {
    return (msDiff / 1000).toFixed(1) + " s"
  } else {
    return msDiff + " ms"
  }
})

const filteredRoutes = computed(() => {
  return routes
    .filter(route => {
      const meta = route.meta
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

      // TODO: fuzzy search and sort on closeness
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

async function getResults() {
  results.value = null
  resultMetrics.value = { startTime: Date.now() }
  const event = new EventSource(`/api/search?q=${query.value}`)
  event.onmessage = (msg) => {
    const json: APISearchDetailResult<any>|APISearchPartialResults = JSON.parse(msg.data)
    if('results' in json) {
      // We have not gotten partial results yet
      results.value = {}
      for(const result of json.results) {
        results.value[result.id] = {
          type: result.type,
          partialContent: result.content,
          data: null
        }

        if(result.type === "user") {
          const steamid2 = SteamID.fromIndividualAccountID(result.id).getSteam2RenderedID()
          results.value[result.id].userData = {
            id: steamid2,
            name: result.content,
            avatarUrl: `/api/users/${steamid2}/avatar`
          }
        }
      }
    } else if(results.value && results.value[json.id]) {
      // Update the partial with full daat
      results.value[json.id].data = json.data
      if(json.type === "activity_log") {
        // TODO: make this a shared method
        results.value[json.id].logData = {
          ...json.data,
          client: json.data.client && {
            steamid: json.data.client,
            name: json.data.client_name ?? json.data.client
          },
          target: json.data.target && {
            steamid: json.data.target,
            name: json.data.target_name ?? json.data.target
          },

        }
      }
    }

    resultMetrics.value.endTime = Date.now()
  }
  event.onerror = () => {
    event.close()
  }
}

watch(() => props.privUser, () => {
  if(!results.value && props.privUser) getResults()
})
onMounted(() => {
  if(props.privUser != undefined)
    getResults()
})

</script>

<style>
</style>

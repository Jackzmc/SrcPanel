<template>
<div class="container">
  <article class="message is-warning">
    <div class="message-body content">
      <b>Feature in development</b><br>
      Feature may have some bugs, in the meantime, you can still use the <router-link :to="{name: 'logs-activity' }">Activity Logs</router-link>.
    </div>
  </article>
  <h4 class="title is-4">
    Showing <input type="number" class="input" min=20 max=1000 step=10 style="width:5%" v-model="limit" @blur="fetchLogs" /> / {{ totalEntries.toLocaleString() }} Entries
    <!-- <em class="subtitle is-4" v-if="hasSearchQuery">({{ notesCount }} filtered)</em> -->
    <a :class="['button','is-info','is-pulled-right',{'is-loading': loadingTime}]" @click="fetchLogs"><Icon icon="sync">Refresh</Icon></a>
  </h4>
  <p class="subtitle is-6">For now only shows results for web panel actions</p>
  <Pagination :page="page" :count="totalEntries" :limit="limit" @page="setPage" />
  <div class="columns">
    <div class="column is-8 box" v-if="loadingTime">
      <p class="has-text-centered is-size-5" style="margin-top:10%">
        <Icon icon="spinner" spin>Loading...</Icon>
        <br>
        {{ loadingDuration }}s
      </p>
    </div>
    <div class="column is-8 box" v-else>
      <div class="list has-visible-pointer-controls has-hoverable-list-items">
        <template v-for="entry in entries" :key="entry.id">
          <div class="list-item">
            <div class="list-item-image">
              <figure class="image is-48x48">
                <img class="is-rounded" :src="entry.client?.avatarUrl || '/img/server_avatar.svg'">
              </figure>
            </div>

            <div class="list-item-content">
              <div class="list-item-title">
                {{ formatDate(entry.timestamp) }}
                <span class="ml-2 has-text-grey-light is-inline subtitle is-6">{{ getRelDate(entry.timestamp) }}</span>
                <span class="tags is-pulled-right">
                  <span :class="['tag', 'is-pulled-right', TYPE_COLORS[entry.type]]">{{ entry.type }}</span>
                  <span :class="['tag', 'is-pulled-right', TYPE_COLORS[entry.server]]">{{ entry.server }}</span>
                </span>
              </div>
              <div class="list-item-description">
                <!-- <UserComponent :user="entry.client" is-admin />
                {{entry.message}}
                <span v-html='entry._html' />
                <UserComponent v-if="entry.target" :user="entry.target"/>
                {{ entry._message2 }} -->
                <LogMessage :log="entry" :priv-user="privUser" :hover-id="hoverId" />
                </div>
            </div>

            <div class="list-item-controls">
              <div class="buttons is-right">
                <!-- <button :class="['button', {'is-info': entry.showDetails, 'is-outlined': entry.showDetails }]">
                  <span @click="entry.showDetails = !entry.showDetails">Details</span>
                </button> -->
                <button class="button is-inverted is-outlined is-black" @click="entry.showDetails = !entry.showDetails">
                  <Icon icon-class="is-small has-text-black" :icon="entry.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'" />
                </button>
              </div>
            </div>
          </div>
          <div class="list-item  px-0 mx-0 my-0 py-0" v-if="entry.showDetails">

            <div class="list-item-content">
              <div class="notification is-dark">
                <p><b>Id:</b> #{{ entry.id }}</p>
                <p><b>Server: </b><span class="tag is-info">reserved</span></p>
                <p><b>Raw Message: </b>{{ entry.message }}</p>
                <template v-if="entry.metadata">
                  <p><b>Metadata: </b></p>
                  <pre class="px-1 py-1 box"><code>{{ JSON.stringify(JSON.parse(entry.metadata), null, 2) }}</code></pre>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="column">
      <article class="message is-warning">
        <div class="message-body content">
          <b>Feature in development</b><br>
          Search is not implemented at this time.
        </div>
      </article>
      <Field label="Search Client" icon-left="search">
        <input type="text" class="input" placeholder="Search for a client" />
      </Field>
      <Field label="Search Target" icon-left="search">
        <input type="text" class="input" placeholder="Search for a target" />
      </Field>
    </div>
  </div>
  <Pagination :page="page" :count="totalEntries" :limit="limit" @page="setPage" />
</div>
</template>


<script setup lang="ts">
import { UserData } from '../../../../common-types/User.js';
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, computed } from 'vue';
import { formatDate, getRelDate, request } from '@/js/util';
import LogMessage from '@/components/LogMessage.vue';
import Field from '@/components/Field.vue';
import Pagination from '@/components/Pagination.vue';

const { notify } = useNotification();

const TYPE_COLORS: Dictionary<string, string> = {
  ACTION: "is-info",
  CHAT: "is-secondary",
  STATE: "is-primary",
  QUIT: "is-danger",
  JOIN: "is-success",
  INFO: "is-link",
  WEB: "is-dark",
};
const SERVER_COLORS: Dictionary<string, string> = {
  main: "is-success",
  reserved: "is-dark",
};

const props = defineProps<{
  userdata: UserData,
  privUser: PrivilegedUser
}>();

let now = ref()
let loadingTime = ref<number>()
let expandedId = ref()
let hoverId = ref()
let page = ref(1);
let limit = ref(30);
let totalEntries = ref(0)
let entries = ref()

const loadingDuration = computed(() => {
  if(!loadingTime.value) return
  return Math.floor((now.value - loadingTime.value) / 1000)
})

async function fetchLogs() {
  loadingTime.value = Date.now()
  const response = await request(`/api/logs/?&page=${page.value}&limit=${limit.value}`)
  loadingTime.value = undefined
  if(response?.ok) {
    const json = await response.json()
    totalEntries.value = json.totalCount
    entries.value = json.logs.map((entry: any) => {
      if(entry.metadata && entry.message) {
        for(const key in entry.metadata) {
          entry.message = entry.message.replace(new RegExp(`%${key}%`, 'g'), `<b data-tooltip="${key}">${entry.metadata[key]}</b>`)
        }
      }
      if(entry.type === 'JOIN') entry.message = " joined"
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        server: entry.server,
        type: entry.type,
        client: {
          steamid: entry.client,
          name: entry.clientName,
          avatarUrl: entry.clientAvatar ? `https://avatars.steamstatic.com/${entry.clientAvatar}.jpg` : "/img/steam_default_avatar.png"
        },
        target: {
          steamid: entry.target,
          name: entry.targetName,
          avatarUrl: entry.targetAvatar ? `https://avatars.steamstatic.com/${entry.targetAvatar}.jpg` : "/img/steam_default_avatar.png"
        },
        metadata: entry.metadata,
        message: entry.message
      }
    })
  }
}
function setPage(pageNum: number) {
  page.value = pageNum;
  fetchLogs();
}

onBeforeMount(() => {
  setInterval(() => {
    now.value = Date.now()
  })
  now.value = Date.now()
  fetchLogs()
})

</script>

<style src="../../../node_modules/bulma-list/css/bulma-list.css" />

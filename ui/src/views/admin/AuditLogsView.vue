<template>
<div class="container">
  <article class="message is-warning">
    <div class="message-body content">
      <b>Feature in development</b><br>
      Feature may not be working, in the meantime, you can still use the <router-link :to="{name: 'logs-activity' }">Activity Logs</router-link>.
    </div>
  </article>
  <h4 class="title is-4">
    Showing <input type="number" class="input" min=20 max=1000 step=10 style="width:5%" v-model="limit" @blur="fetchLogs" /> / {{ totalEntries.toLocaleString() }} Entries
    <!-- <em class="subtitle is-4" v-if="hasSearchQuery">({{ notesCount }} filtered)</em> -->
  </h4>
  <Pagination :page="page" :count="totalEntries" :limit="limit" @page="setPage" />
  <div class="columns">
    <div class="column is-8 box" v-if="loading">
      <p class="has-text-centered my-6 is-size-5"><Icon icon="spinner" spin>Loading...</Icon></p>
    </div>
    <div class="column is-8 box" v-else>
      <div class="list has-visible-pointer-controls has-hoverable-list-items">
        <template v-for="entry in entries" :key="entry.id">
          <div class="list-item">
            <div class="list-item-image" v-if="entry.client.avatarUrl">
              <figure class="image is-48x48">
                <img class="is-rounded" :src="entry.client.avatarUrl">
              </figure>
            </div>

            <div class="list-item-content">
              <div class="list-item-title">
                {{ formatDate(entry.timestamp) }}
                <span class="ml-2 has-text-grey-light is-inline subtitle is-6">{{ getRelDate(entry.timestamp) }}</span>
                <span class="tags is-pulled-right">
                  <span class="tag is-pulled-right is-info">Action</span>
                  <span class="tag is-pulled-right is-dark">reserved</span>
                </span>
              </div>
              <div class="list-item-description">
                <!-- <UserComponent :user="entry.client" is-admin />
                {{entry.message}}
                <span v-html='entry._html' />
                <UserComponent v-if="entry.target" :user="entry.target"/>
                {{ entry._message2 }} -->
                <LogMessage :log="entry" :userdata="userdata" />
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
import { ref, onBeforeMount } from 'vue';
import { formatDate, getRelDate, request } from '@/js/util';
import LogMessage from '@/components/LogMessage.vue';
import Field from '@/components/Field.vue';
import Pagination from '@/components/Pagination.vue';

const { notify } = useNotification();

const props = defineProps<{
  userdata: UserData,
  privUser: PrivilegedUser
}>();

let loading = ref(false)
let expandedId = ref()
let page = ref(1);
let limit = ref(30);
let totalEntries = ref(0)
let entries = ref()

async function fetchLogs() {
  loading.value = true
  const response = await request("/api/logs/?servers=web&page=1&limit=100")
  loading.value = false
  if(response?.ok) {
    const json = await response.json()
    totalEntries.value = json.totalCount
    entries.value = json.logs.map((entry: any) => {
      if(entry.metadata) {
        for(const key in entry.metadata) {
          entry.message = entry.message.replace(new RegExp(`%${key}%`, 'g'), `<b data-tooltip="${key}">${entry.metadata[key]}</b>`)
        }
      }
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        server: entry.server,
        type: entry.type,
        client: entry.client ? {
          steamid: entry.client,
          name: entry.clientName,
          avatarUrl: entry.clientAvatar ? `https://avatars.steamstatic.com/${entry.clientAvatar}.jpg` : null
        } : null,
        target: entry.target ? {
          steamid: entry.target,
          name: entry.targetName,
          avatarUrl: entry.targetAvatar ? `https://avatars.steamstatic.com/${entry.targetAvatar}.jpg` : null
        } : null,
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
  fetchLogs()
})

</script>

<style src="../../../node_modules/bulma-list/css/bulma-list.css" />

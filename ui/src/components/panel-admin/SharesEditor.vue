<template>
<div>
  <table class="table is-fullwidth">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Source Folder</th>
        <th>Steam AppId</th>
        <th>Valid Exts</th>
        <th>Download Sources</th>
        <th>Destinations</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="share in shares" :key="share.id">
      <tr>
        <td><InlineEdit v-model="share.id" /></td>
        <td><InlineEdit v-model="share.name" /></td>
        <td><InlineEdit v-model="share.sourceFolder" /></td>
        <td><InlineEdit v-model="share.appid" /></td>
        <td>
          <span class="tags">
            <span class="tag" v-for="(key) in share.fileExts" :key="key">
              {{ key.replace(/_/, ' ') }}
            </span>
          </span>
        </td>
        <td>
          <span class="tags">
            <span class="tag" v-for="source in getDownloadSources(share.downloadSources)" :key="source">
              {{ source.replace(/_/, ' ') }}
            </span>
          </span>
        </td>
        <td class="pt-0">
          <table class="table is-striped">
            <thead>
              <tr>
              <th>Id</th>
              <th>Name</th>
              <th>Path</th>
              <th>Servers</th>
              </tr>
            </thead>
            <tbody>
            <tr v-for="(data, key) in share.destinations" :key="key">
              <td>{{ key }}</td>
              <td>{{ data.name ?? "no name "}}</td>
              <td>{{ data.path }}</td>
              <td>
                <span class="tags" v-if="data.serverIds">
                  <span class="tag" v-for="(key) in data.serverIds" :key="key">
                    {{ key.replace(/_/, ' ') }}
                  </span>
                </span>
              </td>
            </tr>
            </tbody>
          </table>
        </td>
      </tr>
      </template>
    </tbody>
  </table>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue';
import { request } from '@/js/util';
import InlineEdit from './InlineEdit.vue';

let shares = ref()


function getDownloadSources(sources: any) {
  let enabled = []
  for(const source of Object.keys(sources)) {
    if(sources[source]) enabled.push(source)
  }
  return enabled
}
async function fetchShares() {
  const response = await request("/api/shares?full=1")
  if(response?.ok) {
    const json = await response.json()
    shares.value = json.shares
  }
}

onBeforeMount(() => {
  fetchShares()
})
</script>

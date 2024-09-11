<template>
<div>
  <div class="container">
    <h4 class="title is-4">Select a share</h4>
    <div class="columns">
      <div class="column is-6" v-for="share in shares" :key="share.id">
        <router-link class="box has-background-info-light" :to="{name: 'share-files', params: { shareId: share.id }}">
          <h4 class="title is-4">{{ share.name }} <span v-if="share.appid" data-tooltip="The steam appid for this share"
              class="tag is-dark is-pulled-right">{{ share.appid }}</span></h4>
          <p class="subtitle is-6">{{ share.description ?? '&nbsp;' }}</p>
          <div class="tags" data-tooltip="Install destinations">
            <span class="tag is-dark" v-for="(dest, id) in share.destinations" :key="id">
              {{ id }}
            </span>
          </div>
          <div class="level mt-1 is-mobile">
            <div class="level-left" data-tooltip="Supported file sources">
              <div class="level-item" v-for="(enabled, source) in share.downloadSources" :key="source">
                <span class="tag is-info">
                  {{ source.replace(/_/g, ' ') }}
                </span>
              </div>
            </div>
            <div class="level-right" data-tooltip="Supported file extensions">
              <div class="level-item" v-for="ext in share.fileExts" :key="ext">
                <span class="tag is-info">
                  {{ ext }}
                </span>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted, markRaw, shallowRef } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import Field from '@/components/Field.vue'
import { formatDate, formatSize } from '@/js/util.js'
import { ShareInfo, WorkshopItem } from '../../../../common-types/Share';
import debounce from '@/js/debounce.js';
import { notify } from '@kyvg/vue3-notification';

const route = useRoute()
const router = useRouter()

let error = ref<string>()

let shares = ref<ShareInfo[]>([])

async function fetchShares() {
  error.value = undefined
  shares.value = []
  try {
    const response = await fetch(`/api/shares`)
    const json = await response.json()
    if(response.ok) {
      shares.value = json.map((share: ShareInfo) => {
        const serversCount = Object.values(share.destinations).reduce((pv, cv) => {
          if(cv.serverIds) return pv + cv.serverIds.length
          return pv
        }, 0)
        return {
          serversCount,
          ...share
        }
      })
    } else {
      error.value = json.error ? `${json.error}: ${json.message}` : response.statusText
    }
  } catch(err: any) {
    error.value = err.message || err
  }
}

onMounted(async() => {
  await fetchShares()
})

</script>

<style scope>
.column-separator {
  border-left: solid 1px !important;
}

td {
  vertical-align: middle !important;
}

.collection-row {
  background-color: rgb(243, 244, 246);
}
</style>

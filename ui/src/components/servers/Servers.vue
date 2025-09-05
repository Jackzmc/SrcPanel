<template>
<div>
  <template v-if="servers">
    <ServerTable :priv-user="privUser" v-for="group in servers" :key="group.id" :group="group"></ServerTable>
  </template>
  <div class="table-container" v-else>
    <template  v-for="i in 3" :key="i">
      <div class="skeleton-lines mb-4">
        <div></div>
      </div>
      <table class="table is-fullwidth is-skeleton">
        <tbody>
          <tr v-for="j in 10" :key="j">
            <td></td>
          </tr>
        </tbody>
      </table>
      <br>
    </template>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import ServerTable from "@/components/servers/ServerTable.vue";
import ServerList from "./ServerList.vue";
import { PrivilegedUser } from "@/js/User.js";

const REFRESH_INTERVAL = 1000 * 15;

const emit = defineEmits(["refresh"]);

const props = defineProps<{
  privUser: PrivilegedUser
}>()

let servers = ref<any[]>();
let refreshTimer: any = null

let failureCount = 0
async function refreshServers() {
  if(document.visibilityState === "hidden") return
  emit("refresh", {
    state: "start",
  });
  const response = await fetch("/api/servers")
  if(response.ok) {
    const json = await response.json()
    servers.value = json
    emit("refresh", {
      state: "stop",
      interval: REFRESH_INTERVAL,
    });
    failureCount = 0
    startNextRefresh()
  } else {
    if(failureCount <= 6)
      failureCount++
    const nextRefresh = Math.exp(failureCount) + 15
    startNextRefresh(nextRefresh*1000)
    console.error(`Failed to get servers. failures=${failureCount} nextRefresh=${nextRefresh}s`, response);
  }
}

function startNextRefresh(time = REFRESH_INTERVAL) {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshServers();
  }, time);
}
function onTabActive() {
  if(document.hidden) {
    clearTimeout(refreshTimer)
  } else {
    startNextRefresh()
    refreshServers();
  }
}

onBeforeMount(() => {
  startNextRefresh()
  refreshServers();
  document.addEventListener("visibilitychange", onTabActive);
});

onBeforeUnmount(() => {
  clearTimeout(refreshTimer);
  document.removeEventListener("visibilitychange", onTabActive);
});
</script>

<style scoped>
#lastUpdate {
  position: fixed;
  top: 0;
  right: 5px;
  color: white;
}

b.warn {
  color: #b79613 !important;
}
</style>

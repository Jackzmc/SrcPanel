<template>
<div>
  <ServerTable v-for="group in servers" :key="group.id" :group="group"></ServerTable>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import ServerTable from "@/components/servers/ServerTable.vue";

const REFRESH_INTERVAL = 1000 * 15;

const emit = defineEmits(["refresh"]);

let servers = ref<any[]>([]);
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
  } else {
    failureCount++
    if(failureCount == 3) {
      // Try again later
      clearInterval(refreshTimer)
      setTimeout(() => {
        failureCount = 0;
        createRefreshTimer()
      }, 1000 * 60 * 1)
    }
    console.error("Failure getting servers", response);
  }
}

function createRefreshTimer() {
  refreshTimer = setInterval(() => {
    refreshServers();
  }, REFRESH_INTERVAL);
  refreshServers();
}

onBeforeMount(() => {
  createRefreshTimer()
});

onBeforeUnmount(() => {
  clearInterval(refreshTimer);
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

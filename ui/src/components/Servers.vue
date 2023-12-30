<template>
  <div v-for="group in servers" :key="group.id">
    <h4 class="title is-4">{{ group.name }}</h4>
    <table class="table is-bordered is-fullwidth">
      <thead>
        <tr>
          <th>Name</th>
          <th>Players</th>
          <th>Current Map</th>
          <th>Direct Connect Command</th>
          <th>Create Lobby Command</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="server in group.servers" :key="server.id">
          <td>
            <a :href="'steam://connect/' + server.ip + '/' + server.port">
              <b :data-tooltip="getServerMessage(server)" :class="getServerClasses(server)">
                {{ server.name }}
              </b>
            </a>
            <span class="tags">
              <span class="tag" v-if="server.tags.includes('5+')">5+</span>
              <span class="tag" v-if="server.tags.includes('customs')">Custom Maps</span>
            </span>
          </td>
          <td class="has-text-centered">
            <template v-if="server.status.online">
              {{ server.status.data.players.length }} / {{ server.status.data.maxplayers }}
            </template>
          </td>
          <td>
            <template v-if="server.status.online">
              {{ server.status.data.map }}
            </template>
          </td>
          <td>
            <p @click="copyCommand" :class="{ 'has-text-grey': !server.status.online }">
              connect {{ server.domain }}:{{ server.port }}
            </p>
          </td>
          <td>
            <p @click="copyCommand" :class="{ 'has-text-grey': !server.status.online }">
              mm_dedicated_force_servers {{ server.ip }}:{{ server.port }}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";

const REFRESH_INTERVAL = 1000 * 15;

const emit = defineEmits(["refresh"]);

let servers = ref<any[]>([]);
let refreshTimer: any = null

function copyCommand(event: any) {
  //@ts-ignore
  if (document.selection) {
    // IE
    //@ts-ignore
    const range = document.body.createTextRange();
    range.moveToElementText(event.target);
    range.select();
  } else if (window.getSelection) {
    const range = document.createRange();
    range.selectNode(event.target);
    //@ts-ignore
    window.getSelection().removeAllRanges();
    //@ts-ignore
    window.getSelection().addRange(range);
  }
}
function getServerClasses(server: any) {
  const classes = ["has-tooltip-arrow", "has-tooltip-right"];

  if (server.status.online) {
    if (server.status.data.players.length == 0) {
      classes.push("has-text-success");
      classes.push("has-tooltip-success");
    } else {
      classes.push("");
      classes.push("has-tooltip-info");
    }
  } else {
    classes.push("has-text-danger");
    classes.push("has-tooltip-danger");
  }

  return classes;
}
function getServerMessage(server: any) {
  if (server.status.online)
    return server.status.data.players.length == 0
      ? "Server is currently online & empty. Click to join"
      : "Server has players online. Click to join.";
  else return "Server is offline, unresponsive, or unreachable";
}
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
  } else {
    console.error("Failure getting servers", response);
  }
}

onBeforeMount(() => {
  refreshTimer = setInterval(() => {
    refreshServers();
  }, REFRESH_INTERVAL);
  refreshServers();
});

onBeforeUnmount(() => {
  clearInterval(refreshTimer);
});
</script>

<style>
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

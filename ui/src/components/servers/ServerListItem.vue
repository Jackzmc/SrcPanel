<template>
  <div class="list-item">
    <div class="list-item-content">
      <div class="list-item-title is-family-monospace">
        <Icon class="mr-1"
          :icon="server.online?'fa-circle':'fa-square'"
          :class="serverClasses"
          :data-tooltip="tooltip"
        ></Icon>{{ server.name }}</div>
      <div class="list-item-description">
        <div class="tags is-inline-flex mb-0">
          <span class="tag is-info" v-if="server.online">
            <Icon icon="fa fa-user"></Icon>
            {{ server.status?.data?.players.length ?? 0 }}/{{ server.status?.data?.maxplayers ?? 0 }} players
          </span>
          <span v-else>
            Offline
          </span>
          <template v-if="server.online">
            <span class="tag is-info ">
              <b>Map:</b>&nbsp;c1m1_hotel
            </span>
            <span class="tag is-info ">
              <b>Gamemode:</b>&nbsp;Campaign
            </span>
          </template>
          <!-- <span class="tag" v-if="server.status.data?.map">
            {{ server.status.data?.map }}
          </span> -->
        </div>
        <div class="tags is-pulled-right">
          <span class="tag is-small is-radiusless has-text-white has-background-dark">
            <b>connect</b>&nbsp;l4d2.jackz.me
          </span>
          <span class="tag is-small is-radiusless has-text-white has-background-dark">
            <b>mm_dedicated_force_servers</b>&nbsp;147.135.1.163:27016
          </span>
        </div>
      </div>
      <div class="list-item-description py-2">
        <span class="tags">
          <span class="tag">5+</span>
          <span class="tag">customs</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { request } from '@/js/util.js';
import { ServerInfo, ServerType, ServerAction, ServerAvailableFeatures } from '../../../../common-types/Server';
import { computed, ref } from 'vue';
import { notify } from '@kyvg/vue3-notification';
const props = defineProps<{
  server: ServerInfo,
  game: string,
  manage?: boolean
}>()

let actionRunning = ref(false)

async function processAction(action?: ServerAction, command?: string) {
  if(!action && !command) throw new Error("no action nor command")
  if(!command) command = action!.command
  actionRunning.value = true

  const response = await request(`/api/servers/${props.server.id}/action/${command}`, {
    method: 'POST',
    credentials: 'include'
  })

  actionRunning.value = false

  if(response?.ok) {
    // there is no json body:
    if(response.status === 204) {
      return notify({ type: 'success', text: `${action?.name ?? command} ran successfully`, title: props.server.name })
    }
    const json = await response.json()
    if(json.error) {
      notify({ type: 'error', text: json.message, title: `Server (${props.server.id}) returned error` })
    } else if(json.response.includes("players online")) {
      notify({ type: 'error', text: "Request failed: There are players online.", title: props.server.name })
    } else {
      notify({ type: 'success', text: `${action?.name ?? command} ran successfully`, title: props.server.name })
    }
  }
}

const actions = computed(() => {
  return props.server.actions
    // Filter out any actions that their required feature is not available
    .filter(action => {
      if(!action.requiresFeatures) return true
      for(const feat of action.requiresFeatures) {
        if(!props.server!.features[feat as keyof ServerAvailableFeatures]) {
          return false
        }
      }
      return true
    })
    // Filter out any action that aren't visible
    .filter(action => {
      if(action.showWhen === "any") return true
      if(props.server.online && action.showWhen === "online") return true
      else if(!props.server.online && action.showWhen === "offline") return true

      console.log(props.server.id, action.name, action.showWhen ?? "any", props.server.online)
      return false
    })
    .filter(action => !action.isHidden)
})

const trClass = computed(() => {
  const classes: string[] = []
  if(props.manage) {
    classes.push(props.server.online ? "is-size-5" : "is-size-6")
  }
  return classes
})
const serverClasses = computed(() => {
  const classes = ["has-tooltip-arrow", "has-tooltip-right", "no-border"];

  if (props.server.online) {
    const count = props.server.status?.data?.players.length
    if (count && count > 0) {
      classes.push("has-text-info")
      if(!props.manage) classes.push("has-tooltip-info");
    } else {
      classes.push("has-text-success");
      if(!props.manage) classes.push("has-tooltip-success");
    }
  } else {
    classes.push("has-text-danger");
    if(!props.manage) classes.push("has-tooltip-danger");
  }

  return classes;
})
const tooltip = computed(() => {
  if(props.manage) return "Click to manage server"
  if (props.server.online) {
    if(!props.server.status?.data) return "Server is online, but cannot get data"
    return props.server.status.data.players.length == 0
      ? "Server is currently online & empty. Click to join"
      : "Server has players online. Click to join.";
  } else return "Server is offline, unresponsive, or unreachable";
})
</script>

<template>
  <tr :class="trClass">
    <td>
      <router-link :class="serverClasses" v-if="privUser" :to="{name: 'admin-server-view', params: { serverId: server.id, tab: 'overview' }}" :data-tooltip="tooltip">
        <b>{{server.name}}</b>
      </router-link>
      <div v-else :class="serverClasses" :data-tooltip="tooltip">
        <b>{{server.name}}</b>
      </div>
      <span class="tags">
        <span class="tag" v-if="server.tags.includes('5+')">5+</span>
        <span class="tag" v-if="server.tags.includes('customs')">Custom Maps</span>
      </span>
    </td>
    <td :class="manage ? undefined : 'has-text-centered'">
      <template v-if="server.online">
        {{ server.status?.data?.players.length }} / {{ server.status?.data?.maxplayers }}
      </template>
    </td>
    <template v-if="manage">
      <td v-if="gameType === 'source'">
        {{ server.status?.data?.map }}
      </td>
      <td>
        <!-- <div class="buttons" v-if="server.features.includes('plugin')"> -->
        <div class="buttons">
          <button v-for="(action, i) in actions" :key="i"
            :data-tooltip="action.description" :disabled="actionRunning"
            class="button is-dark" :style="{'background-color': action.color}"
            @click="processAction(action)"
          >
            {{ action.name }}
          </button>
          <Icon data-tooltip="No live data available" size="xs" icon="fa-plug-circle-minus" icon-class="has-text-danger" />
        </div>
        <!-- <Icon class="is-size-6 no-border" v-else icon="fa-plug-circle-minus" data-tooltip="No connection to plugin, cannot perform actions at this time">Unavailable</Icon> -->
      </td>
    </template>
    <template v-else>
      <template v-if="gameType === 'source'">
        <td>
          <template v-if="server.online">
            {{ server.status?.data?.map }}
          </template>
        </td>
        <td>
          <div @click="copyCommand" :class="[{ 'has-text-grey': !server.online },'is-inline']">
            connect {{ server.host }}:{{ server.port }}
          </div>
          <a data-tooltip="Click to join game" class="is-pulled-right" v-if="server.online" :href="'steam://connect/' + server.ip + '/' + server.port">[Join]</a>
        </td>
        <td>
          <p @click="copyCommand" :class="{ 'has-text-grey': !server.online }">
            mm_dedicated_force_servers {{ server.ip }}:{{ server.port }}
          </p>
        </td>
      </template>
      <template v-else-if="gameType === 'minecraft'">
        <td>
          {{ server.host ?? server.ip }}:{{ server.port }}
        </td>
      </template>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { request } from '@/js/util.js';
import { ServerInfo, ServerType, ServerAction, ServerAvailableFeatures, GAME_TYPE_MAP, GAME_TYPE_CONFIG } from '../../../../common-types/Server';
import { computed, ref } from 'vue';
import { notify } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User.js';
const props = defineProps<{
  server: ServerInfo,
  game: string,
  manage?: boolean,
  privUser: PrivilegedUser
}>()

const gameType = computed(() => {
  return GAME_TYPE_MAP[props.game]
})
const gameConfig = computed(() => {
  return (gameType.value && GAME_TYPE_CONFIG[gameType.value]) || {}
})


let actionRunning = ref(false)

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
  const classes = ["has-tooltip-arrow", "has-tooltip-right"];

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
  let output = ""
  if (props.server.online) {
    if(!props.server.status?.data) output = "Server is online, but cannot get data"
    else {
      output = props.server.status.data.players.length == 0
        ? "Server is empty"
        : "Server has players online";
    }
  } else {
    output = "Server is offline, unresponsive, or unreachable";
  }
  if(props.privUser) output += "\nClick to manage"
  return output
})
</script>

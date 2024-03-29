<template>
  <tr :class="trClass">
    <td>
      <router-link v-if="manage" :to="{name: 'admin-server-view', params: { id: server.id, tab: 'overview' }}" :data-tooltip="tooltip">
        <b :class="serverClasses" >{{server.name}}</b>
      </router-link>
      <a v-else :href="'steam://connect/' + server.ip + '/' + server.port">
        <b :data-tooltip="tooltip" :class="serverClasses">
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
        {{ server.status.data?.players.length }} / {{ server.status.data?.maxplayers }}
      </template>
    </td>
    <template v-if="manage">
      <td v-if="server.type === 'source'">
        {{ server.status?.data?.map }}
      </td>
      <td>
        <div class="buttons" v-if="server.features.includes('plugin')">
          <button :disabled="actionRunning" v-if="server.features.includes('systemd')" @click="processAction(undefined, 'start')" class="button is-success">Start</button>
          <template v-if="server.status.online">
            <button :data-tooltip="action.description" :disabled="actionRunning" v-for="(action, i) in actions" :key="i" @click="processAction(action)" class="button is-dark" :style="{'background-color': action.color}">{{ action.name }}</button>
          </template>
        </div>
        <Icon class="is-size-6" v-else icon="fa-plug-circle-minus" data-tooltip="No connection to plugin, cannot perform actions at this time">Unavailable</Icon>
      </td>
    </template>
    <template v-else>
      <template v-if="type === 'source'">
        <td>
          <template v-if="server.status.online">
            {{ server.status.data?.map }}
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
      </template>
      <template v-else-if="type === 'minecraft'">
        <td>
          {{ server.domain ?? server.ip }}:{{ server.port }}
        </td>
      </template>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { request } from '@/js/util.js';
import { ServerInfo, ServerType, ServerAction } from '../../../common-types/Server';
import { computed, ref } from 'vue';
import { notify } from '@kyvg/vue3-notification';
const props = defineProps<{
  server: ServerInfo,
  type: ServerType,
  manage?: boolean
}>()

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

async function processAction(action?: ServerAction, command?: string, args: string[] = []) {
  if(!action && !command) throw new Error("no action nor command")
  if(!command) command = action!.command
  actionRunning.value = true

  const response = await request(`/api/servers/${props.server.id}/action/${command}?args=${args.join(",")}`, {
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
  return props.server.actions.filter(action => !action.isHidden)
})

const trClass = computed(() => {
  const classes: string[] = []
  if(props.manage) {
    classes.push(props.server.status.online ? "is-size-5" : "is-size-6")
  }
  return classes
})
const serverClasses = computed(() => {
  const classes = ["has-tooltip-arrow", "has-tooltip-right"];

  if (props.server.status.online) {
    if (props.server.status.data?.players.length == 0) {
      classes.push("has-text-success");
      if(!props.manage) classes.push("has-tooltip-success");
    } else {
      if(!props.manage) classes.push("has-tooltip-info");
    }
  } else {
    classes.push("has-text-danger");
    if(!props.manage) classes.push("has-tooltip-danger");
  }

  return classes;
})
const tooltip = computed(() => {
  if(props.manage) return "Click to manage server"
  if (props.server.status.online)
    return props.server.status.data?.players.length == 0
      ? "Server is currently online & empty. Click to join"
      : "Server has players online. Click to join.";
  else return "Server is offline, unresponsive, or unreachable";
})
</script>

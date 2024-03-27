<template>
  <tr>
    <td>
      <a :href="'steam://connect/' + server.ip + '/' + server.port">
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
    <template v-if="type === 'left4dead2' || type === 'source'">
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
  </tr>
</template>

<script setup lang="ts">
import { GroupedServer, ServerType } from '../../../common-types/Server';
import { computed } from 'vue';
const props = defineProps<{
  server: GroupedServer,
  type: ServerType
}>()

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

const serverClasses = computed(() => {
  const classes = ["has-tooltip-arrow", "has-tooltip-right"];

  if (props.server.status.online) {
    if (props.server.status.data?.players.length == 0) {
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
})
const tooltip = computed(() => {
  if (props.server.status.online)
    return props.server.status.data?.players.length == 0
      ? "Server is currently online & empty. Click to join"
      : "Server has players online. Click to join.";
  else return "Server is offline, unresponsive, or unreachable";
})
</script>

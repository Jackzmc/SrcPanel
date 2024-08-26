<template>
  <td>
    <span :class="['tag', 'is-pulled-left mr-2 mt-1', FILTER_DATA.types[props.log.type]]">
      <Icon :icon="icon" v-if="icon" :icon-class="iconClass" />
      {{ props.log.type }}
    </span>
    <template v-if="props.log.type === 'CHAT'">
      <b><UserComponent hide-avatar :user="props.log.client" type="client" @set-filter="setFilter"/>: </b>
      <span :class="{'tag is-warning': props.log.adminChat}" v-html="chatMessage" />
    </template>
    <template v-else>
      <b v-if="LPieceCount == 0 && props.log.client.steamid">
        <UserComponent hide-avatar :user="props.log.client" type="client" @set-filter="setFilter" />&nbsp;
      </b>
      <b v-else-if="LPieceCount == 0 && !props.log.client.steamid && props.log.target.steamid">
        <UserComponent hide-avatar type="target" :user="props.log.target" @set-filter="setFilter" />
      </b>
      <template v-for="m in messagePieces" :key="m">
        <b v-if="m.LMatch">
          <UserComponent hide-avatar v-if="m.user" :user="m.user" :type="m.type" @set-filter="setFilter" />
        </b>
        <span v-else v-html="m.content" :class="{
          'has-text-danger': props.log.type === 'QUIT',
          'has-text-success': props.log.type === 'JOIN',
          'has-text-info': props.log.type === 'INFO',
          'has-text-weight-bold': props.log.type === 'INFO'
        }"></span>
      </template>
    </template>
    <span v-if="log.via === 'rcon'" class="has-text-info ml-1">(via console)&nbsp;</span>
    <span v-if="
        !props.log.redacted &&
        props.hoverId == props.log.id &&
        props.log.type === 'CHAT' &&
        props.log.client?.steamid === privUser.id"
      >
      <a data-tooltip="Redact your own message" class="has-text-danger" @click="redactID(log.id)">
        (redact)
      </a>
    </span>
  </td>
</template>

<script setup lang="ts">
import { computed, ref } from "@vue/reactivity";
import UserComponent from "@/components/UserComponent.vue";
import { PrivilegedUser } from "@/js/User.js";
const emit = defineEmits(["set-filter", "redact-id"]);
const props = defineProps<{
  log: any,
  hoverId?: number,
  privUser: PrivilegedUser
  highlightRegex?: RegExp
}>()

let LPieceCount = ref(0)

const FILTER_DATA: Record<string, Record<string, boolean | string>> = {
  types: {
    ACTION: "is-info",
    CHAT: "is-secondary",
    STATE: "is-primary",
    QUIT: "is-danger",
    JOIN: "is-success",
    INFO: "is-link",
  },
}

function setFilter(type: string, id: string) {
  emit("set-filter", type, id)
}
function redactID(id: number) {
  emit("redact-id", id)
}

const icon = computed(() => {
  if(props.log.server === 'web') return "fa-cloud"
  switch(props.log.type) {
    case "CHAT": return "fa-regular fa-comment"
    case "JOIN": return "fa-plus"
    case "QUIT": return "fa-arrow-right-from-bracket"
  }
  return null
})
const iconClass = computed(() => {
  switch(props.log.type) {
    // case "JOIN": return "mt-1 has-text-success"
    // case "QUIT": return "mt-1 has-text-danger"
  }
  return "mt-1"
})
const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/;
const chatMessage = computed(() => {
  if(!props.log.message || props.log.type !== "CHAT") return
  let message = props.log.message
  if(props.highlightRegex) message = message.replace(props.highlightRegex, '<b>$1</b>')
  return message
})
const messagePieces = computed(() => {
  if(!props.log.message || props.log.type === "CHAT") return []

  const pieces = [];
  let lPieceCount = 0
  let index = 0;
  for (let i = 0; i < 2; i++) {
    const match = props.log.message.slice(index).match(FULLNAME_REGEX);
    if (match) {
      let prevSlice: string = props.log.message.slice(index, index + match.index)
      if(prevSlice[0] !== " ") prevSlice = " " + prevSlice
      if(props.highlightRegex) prevSlice = prevSlice.replace(props.highlightRegex, "<b>$1</b>")
      pieces.push({
        content: prevSlice
      });

      let type, user
      let [, name, steamid] = match

      if((steamid === "BOT" && i === 0) || props.log.client.steamid === steamid) {
        type = "client"
        if(steamid === "BOT") steamid = null
        user = { name: props.log.client.name || name, steamid }
      } else if((steamid === "BOT" && i === 1) || props.log.target.steamid === steamid) {
        type = "target"
        if(steamid === "BOT") steamid = null
        user = { name: props.log.target.name || name, steamid }
      }
      if(user) {
        lPieceCount++;
      }

      pieces.push({
        content: match[0],
        LMatch: true,
        steamid: match[2],
        user,
        type
      });
      index = match.index + match[0].length + index;
    } else {
      break;
    }
  }
  LPieceCount.value = lPieceCount
  let message = props.log.message.slice(index)
  if(props.highlightRegex) message = message.replace(props.highlightRegex, "<b>$1</b>")
  pieces.push({ content: message });
  return pieces;
});

</script>

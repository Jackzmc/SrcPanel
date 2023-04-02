<template>
  <td>
    <Icon :icon="icon" v-if="icon" :icon-class="iconClass" />
    <template v-if="props.log.type === 'CHAT'">
      <b><UserComponent :user="props.log.client" type="client" @set-filter="setFilter"/>: </b>
      <span v-html="chatMessage" />
    </template>
    <template v-else>
      <b v-if="LPieceCount == 0 && props.log.client.steamid"><UserComponent :user="props.log.client" type="client" @set-filter="setFilter" /></b>
      <b v-else-if="LPieceCount == 0 && !props.log.client.steamid && props.log.target.steamid"><UserComponent type="target" :user="props.log.target" @set-filter="setFilter" /></b>
      <template v-for="m in messagePieces" :key="m">
        <b v-if="m.LMatch">
          <UserComponent v-if="m.user" :user="m.user" :type="m.type" @set-filter="setFilter" />
        </b>
        <span v-else v-html="m.content" :class="{'has-text-danger': props.log.type === 'QUIT', 'has-text-success': props.log.type === 'JOIN', 'has-text-info': props.log.type === 'INFO', 'has-text-weight-bold': props.log.type === 'INFO'}"></span>
      </template>
    </template>
    <a
      v-if="
        !props.log.redacted &&
        props.hoverId == props.log.id &&
        props.log.type === 'CHAT' &&
        props.log.client?.steamid === privUser.id
      "
      data-tooltip="Redact your own message"
      class="has-text-danger"
      @click="redactID(log.id)"
      >(redact)</a
    >
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
    case "JOIN": return "has-text-success"
    case "QUIT": return "has-text-danger"
  }
  return undefined
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

      let [, name, steamid] = match

      let type, user
      if((steamid === "BOT" && name === props.log.client.steamid) || props.log.client.steamid === steamid) {
        type = "client"
        if(steamid === "BOT") steamid = null
        user = { name: props.log.client.name || name, steamid }
      } else if((steamid === "BOT" && name === props.log.target.steamid) || props.log.target.steamid === steamid) {
        type = "target"
        if(steamid === "BOT") steamid = null
        user = { name: props.log.target.name || name, steamid }
      }
      pieces.push({
        content: match[0],
        LMatch: true,
        steamid: match[2],
        user,
        type
      });
      index = match.index + match[0].length + index;
      LPieceCount.value++
    } else {
      break;
    }
  }
  let message = props.log.message.slice(index)
  if(props.highlightRegex) message = message.replace(props.highlightRegex, "<b>$1</b>")
  pieces.push({ content: message });
  return pieces;
});

</script>

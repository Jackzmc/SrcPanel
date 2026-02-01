<template>
  <span v-if="props.log.adminChat" class="tag is-pulled-left is-warning mr-2 mt-1" data-tooltip="Message was sent in the admin chat">
    <Icon v-if="icon" :icon="icon" icon-class="pr-1" />CHAT</span>
  <span v-else :class="['tag', 'is-pulled-left mr-2 mt-1', FILTER_DATA.types[props.log.type]]">
    <Icon v-if="icon" :icon="icon" icon-class="pr-1" />
    {{ props.log.type }}
  </span>
  <template v-if="props.log.type === 'CHAT'">
    <b><UserComponent hide-avatar :user="props.log.client" type="client" @set-filter="setFilter" />: </b>
      <!-- eslint-disable vue/no-v-html -- sanitized -->
      <span :class="{'tag is-warning': props.log.adminChat}" v-html="chatMessage" />
  </template>
  <template v-else>
    <b v-if="LPieceCount == 0 && props.log.client.steamid">
      <UserComponent hide-avatar :user="props.log.client" type="client" @set-filter="setFilter" />&nbsp;
    </b>
    <b v-else-if="LPieceCount == 0 && !props.log.client.steamid && props.log.target.steamid">
      <UserComponent hide-avatar type="target" :user="props.log.target" @set-filter="setFilter" />
    </b>
    <template v-for="m in msgParts" :key="m">
      <b v-if="m.user">
        <UserComponent v-if="m.user" hide-avatar :user="m.user" :type="m.type" @set-filter="setFilter" />
      </b>
      <!-- eslint-disable vue/no-v-html -- sanitized -->
      <span v-else :class="{
        'has-text-danger': props.log.type === 'QUIT',
        'has-text-success': props.log.type === 'JOIN',
        'has-text-info': props.log.type === 'INFO',
        'has-text-weight-bold': props.log.type === 'INFO'
      }" v-html="m.content"></span>
    </template>
  </template>
  <span v-if="log.via === 'rcon'" class="has-text-info ml-1">(via console)&nbsp;</span>
  <span v-if="
      !props.log.redacted &&
      props.hoverId == props.log.id &&
      props.log.type === 'CHAT' &&
      props.log.client?.steamid === privUser?.id"
    >
    <a data-tooltip="Redact your own message" class="has-text-danger" @click="redactID(log.id)">
      (redact)
    </a>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue";
import UserComponent from "@/components/UserComponent.vue";
import { PrivilegedUser } from "@/js/User.js";
import DOMPurify from 'dompurify'
import { UILogEntry } from "@/views/admin/AuditLogsView.vue";
import { LogMessagePart, parseLogMessage } from "@/js/logs.js";
const emit = defineEmits(["set-filter", "redact-id"]);
const props = defineProps<{
  log: UILogEntry,
  hoverId?: number,
  privUser?: PrivilegedUser
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
const chatMessage = computed(() => {
  if(!props.log.message || props.log.type !== "CHAT") return
  let message = props.log.message
  if(props.highlightRegex) message = message.replace(props.highlightRegex, '<b>$1</b>')
  return message
})

const msgParts = ref<LogMessagePart[]>()


onBeforeMount(() => {
  if(!props.log.message || props.log.type === "CHAT") return []

  const msg = DOMPurify.sanitize(props.log.message)

  const { parts, lPieceCount } = parseLogMessage(msg, props.log.client, props.log.target, props.highlightRegex)
  msgParts.value = parts
  LPieceCount.value = lPieceCount
})

</script>

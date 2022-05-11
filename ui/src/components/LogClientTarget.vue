<template>
  <component
    :is="user.hasStats?'a':'span'"
    @click.ctrl="openStatsProfile(user.steamid)"
    @click="setUserFilter(user.steamid)"
    :data-tooltip="tooltip"
  >
    {{ user.name }}
  </component>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted, defineEmits } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['set-filter'])
const route = useRoute()
const router = useRouter()
const props = defineProps([
  "user",
  "type"
])

const tooltip = computed(() => {
  let output = `${props.user.steamid}\n\nClick to only see entries from this user.`
  if(props.user.hasStats) {
    output += `\nCtrl + Click to view stats profile`
  }
  return output
})

function openStatsProfile(id: string) {
  window.open(`https://stats.jackz.me/user/${id}/overview`)
}
function setUserFilter(steamid: string) {
  emit('set-filter', { type: props.type.value, steamid })
}
</script>

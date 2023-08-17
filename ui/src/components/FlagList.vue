<template>
<div>
  <div class="field">
    <input
      id="z"
      type="checkbox"
      value="z"
      :class="['is-checkradio',,{'has-no-border': !editable}]"
      v-model="editedFlags"
      :disabled="!hasRoot"
    >
    <label>Root (All Permissions)</label>
  </div>
  <div class="field" v-for="(name, flag) in shownFlags" :key="flag">
    <input
      :id="flag"
      type="checkbox"
      :value="flag"
      :class="['is-checkradio',{'has-no-border': !editable}]"
      v-model="editedFlags"
      :disabled="!hasRoot && privUser.flags.indexOf(flag) === -1"
    >
    <label :for="flag">{{name}} <span class="tag">{{flag}}</span></label>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { PrivilegedUser } from '@/js/User'

// TODO: Move to common
const FLAGS: Record<string,string> = {
  'a': 'Reserved Slot',
  'b': 'Generic Admin',
  'c': 'Kick',
  'd': 'Ban',
  'e': 'Unban',
  'f': 'Slay/harm others',
  'g': 'Change the map',
  'h': 'Change cvar rules',
  'i': 'Execute custom config files',
  'j': 'Use admin chat',
  'k': 'Start a generic vote',
  // 'l': 'Set a password on the server',
  'm': 'Ingame rcon access',
  'n': 'Enable sv_cheats or use cheat commands',
  'o': 'Custom 1',
  'p': 'Custom 2',
  'q': 'Custom 3',
  'r': 'Custom 4',
  's': 'Custom 5',
  't': 'Custom 6',
}

const props = defineProps<{
  privUser: PrivilegedUser,
  flags: string,
  editable?: boolean,
  onlyActive?: boolean
}>()

let editedFlags = ref(props.flags.split(''))

watch(editedFlags, () => {
  if(!props.editable) {
    editedFlags.value = props.flags.split('')
  }
})

const shownFlags = computed(() => {
  // TODO: Show only active flags
  if(props.onlyActive) {
    let shown: Record<string,string> = {}
    for(const key in FLAGS) {
      if(props.flags.includes(key)) {
        shown[key] = FLAGS[key]
      }
    }
    return shown
  } else {
    return FLAGS
  }
})

const hasRoot = computed(() => {
  return props.privUser.permissions.flags?.indexOf('z') !== -1
})
</script>

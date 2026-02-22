<template>
<div>
  <CmdModal v-if="cmd" :cmd="cmd" @close="router.back()" />
  <span v-else>404</span>
</div>
</template>

<script setup lang="ts">
import { parseCommand, type Command } from '@common/methods/cmds/util'
import type { CommandGroups } from '@common/methods/cmds/data'
import CmdModal from '~/components/commands/CmdModal.vue'

const route = useRoute()
const router = useRouter()
const cmdName = route.params.cmd as string

declare const __BUILD_DATE__: string

const baseURL = import.meta.server
  ? useRequestURL().origin
  : useRuntimeConfig().app.baseURL

// Same key as index.vue — reuses cached data, no extra request
const { data: groups } = await useFetch<CommandGroups>(`/data/commands.json?t=${__BUILD_DATE__}`, { key: 'commands', baseURL })

const cmd = computed<Command | undefined>(() => {
  if (!groups.value) return undefined
  for (const group of Object.values(groups.value)) {
    const match = group.commands.find(c => c.command === cmdName || c.command.split(' ')[0] === cmdName)
    if (match) return parseCommand(match)
  }
  return undefined
})
</script>

<template>
  <template v-if="!cmd.consoleOnly && !cmd.hidePrefix">
    {{ prefix }}
  </template>{{ cmd.name }}
  <CmdArg
v-for="(data, i) in cmd.args"
:key="i"
    class="mx-1"
    :arg="data.name"
    :required="data.required"
    :type="data.type"
    :allowed-values="data.allowedValues"
  />
</template>

<script setup lang="ts">
import type { Command } from '@jzpanel/common/cmds/util'
import CmdArg from './CmdArg.vue'

const props = withDefaults(defineProps<{
  cmd: Command,
  prefix?: string
}>(), { prefix: "/" })
</script>

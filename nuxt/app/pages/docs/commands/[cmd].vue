<template>
  <div>
    <CmdModal v-if="cmd" :cmd="cmd" @close="router.back()" />
    <span v-else>404</span>
  </div>
</template>

<script setup lang="ts">
import { parseCommand, type Command } from "@srcpanel/common/cmds/util";
import type { CommandGroups } from "@srcpanel/common/cmds/data";
import CmdModal from "~/components/commands/CmdModal.vue";

import CMD_DATA from "~/assets/data/commands.json";

const route = useRoute();
const router = useRouter();
const cmdName = route.params.cmd as string;
const groups = CMD_DATA as CommandGroups;

const cmd = computed<Command | undefined>(() => {
  if (!groups) return undefined;
  for (const group of Object.values(groups)) {
    const match = group.commands.find(c => c.command === cmdName || c.command.split(" ")[0] === cmdName);
    if (match) return parseCommand(match);
  }
  return undefined;
});

useSeoMeta({
  title: () => `${cmdName} - Commands - Tools`,
  ogTitle: () => cmdName,
  description: () => cmd.value?.description,
  ogDescription: () => cmd.value?.description,
});
</script>

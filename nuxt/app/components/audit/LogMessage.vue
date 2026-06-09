<template>
  <template v-if="!parseResult || parseResult.lPieceCount == 0">
    <UserComponent v-if="client" :user="client" class="text-primary font-bold" hide-avatar style="margin-right:4px" />
    <UserComponent v-else-if="target" :user="target" class="text-primary font-bold" hide-avatar style="margin-right:4px" />
  </template>
  <template v-if="parseResult">
    <template v-for="part, i in parseResult.parts" :key="i">
      <template v-if="part.type == 'client' || part.type == 'target'">
        <template v-if="part.user">
          <UserComponent v-if="part.user.steamid != 'BOT'" :user="part.user" class="text-primary font-bold" hide-avatar style="margin-right:4px" />
          <strong v-else style="margin-right:4px">{{ part.user.name }}</strong>
        </template>
        <strong v-else>{{ part.content }}</strong>
      </template>
      <strong v-else-if="part.user" style="margin-right:4px">{{ part.user.name }}</strong>
      <UTooltip v-else-if="part.type == 'variable'" class="mr-1" :text="'variable: ' + part.content">
        <strong>{{ (props.metadata && props.metadata[part.content]) ?? part.content }}</strong>
      </UTooltip>
      <component :is="part.isBold ? 'b' : 'span'" v-else style="margin-right:2px">
        {{ part.content }}
      </component>
    </template>
  </template>
</template>

<script setup lang="ts">
import UserComponent from "@/components/UserComponent.vue";
import { parseLogMessage, type LogEntryUser } from "@jzpanel/common/logs";

const props = defineProps<{
  client?: LogEntryUser;
  target?: LogEntryUser;
  message?: string;
  metadata?: Record<string, unknown>;
  type?: string;
}>();

const parseResult = computed(() => {
  const msg = (props.type == "CHAT" && props.metadata?.admin_chat) ? "%text%" : props.message;
  return msg && parseLogMessage(msg, props.client, props.target);
});
</script>

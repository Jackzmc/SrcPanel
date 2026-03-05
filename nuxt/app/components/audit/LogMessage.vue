<template>
  <template v-if="parseResult.lPieceCount == 0">
    <UserComponent v-if="client" :user="client" class="text-primary font-bold" hide-avatar style="margin-right:4px" />
    <UserComponent v-else-if="target" :user="target" class="text-primary font-bold" hide-avatar style="margin-right:4px" />
  </template>
  <template v-for="part,i in parseResult.parts" :key="i">
    <template v-if="part.type == 'client' || part.type == 'target'">
      <template v-if="part.user">
        <UserComponent v-if="part.user.steamid != 'BOT'" :user="part.user" class="text-primary font-bold" hide-avatar style="margin-right:4px"  />
        <strong v-else style="margin-right:4px" >{{ part.user.name }}</strong>
      </template>
      <strong v-else>{{ part.content }}</strong>
    </template>
    <strong v-else-if="part.user" style="margin-right:4px">{{ part.user.name }}</strong>
    <component v-else :is="part.isBold ? 'b' : 'span'" style="margin-right:4px">
      {{ part.content }}
    </component>
  </template>
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import { parseLogMessage, type LogEntryUser } from '@common/methods/logs';

const props = defineProps<{
  client?: LogEntryUser,
  target?: LogEntryUser,
  message: string,
  metadata?: Record<string, any>
}>()

const parseResult = computed(() => {
  return parseLogMessage(props.message, props.client, props.target )
})
</script>

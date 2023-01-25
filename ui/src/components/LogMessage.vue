<template>
  <td>
    <template v-for="m in messagePieces" :key="m">
      <b v-if="m.LMatch"> [LMATCH] </b>
      <span v-else>{{ m.content }}</span>
      <!-- <component :is="m.LMatch ? 'b' : 'span'">{{ m.content }}</component> -->
    </template>
  </td>
</template>

<script setup lang="ts">
import { computed } from "@vue/reactivity";
import LogClientTarget from "@/components/LogClientTarget.vue";
const props = defineProps(["log"]);

const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/;
const messagePieces = computed(() => {
  const pieces = [];
  let index = 0;
  for (let i = 0; i < 2; i++) {
    const match = props.log.messageRaw.slice(index).match(FULLNAME_REGEX);
    if (match) {
      console.log(
        props.log.id,
        "got match",
        match[0],
        `${match.index}-${match[0].length}`
      );
      console.log("oldStr:", props.log.messageRaw.slice(index, match.index));
      pieces.push({
        content: props.log.messageRaw.slice(index, match.index),
      });
      pieces.push({
        content: match[0],
        LMatch: true,
      });
      index = match.index + match[0].length;
    } else {
      break;
    }
  }
  pieces.push(props.log.messageRaw.slice(index));
  return pieces;
});

function redactID(id: number) {}
</script>

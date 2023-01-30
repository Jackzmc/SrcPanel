<template>
  <td>
    <template v-if="props.log.type === 'CHAT'">
      <b v-if="props.log.type === 'CHAT'" ><LogClientTarget :user="props.log.client" type="client" @set-filter="setFilter" />: </b>
      <span v-html="props.log.message" />
    </template>
    <template v-else>
      <b v-if="LPieceCount == 0 && props.log.client.steamid"><LogClientTarget :user="props.log.client" type="client" @set-filter="setFilter" /></b>
      <b v-else-if="LPieceCount == 0 && !props.log.client.steamid && props.log.target.steamid"><LogClientTarget type="target" :user="props.log.target" @set-filter="setFilter" /></b>
      <template v-for="m in messagePieces" :key="m">
        <b v-if="m.LMatch">
          <LogClientTarget v-if="m.user" :user="m.user" :type="m.type" @set-filter="setFilter" />
        </b>
        <span v-else>{{ m.content }}</span>
        <!-- <component :is="m.LMatch ? 'b' : 'span'">{{ m.content }}</component> -->
      </template>
    </template>
    <a
      v-if="
        !props.log.redacted &&
        props.hoverId == props.log.id &&
        props.log.type === 'CHAT' &&
        props.log.client.steamid === userdata.user.steamid
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
import LogClientTarget from "@/components/LogClientTarget.vue";
const emit = defineEmits(["set-filter", "redact-id"]);
const props = defineProps(["log", "hoverId", "userdata"]);

let LPieceCount = ref(0)

function setFilter(type: string, id: string) {
  emit("set-filter", type, id)
}
function redactID(id: number) {
  emit("redact-id", id)
}

const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/;
const messagePieces = computed(() => {
  const pieces = [];
  let index = 0;
  for (let i = 0; i < 2; i++) {
    const match = props.log.message.slice(index).match(FULLNAME_REGEX);
    if (match) {
      let prevSlice = props.log.message.slice(index, index + match.index)
      if(prevSlice[0] !== " ") prevSlice = " " + prevSlice
      pieces.push({
        content: prevSlice
      });

      const [, name, steamid] = match

      let type, user
      if(steamid === "BOT" && name === props.log.client.steamid || props.log.client.steamid && props.log.client.steamid === steamid) {
        type = "client"
        user = props.log.client
      } else if(steamid === "BOT" && name === props.log.target.steamid || props.log.target.steamid && props.log.target.steamid === steamid) {
        type = "target"
        user = props.log.target
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
  pieces.push({ content: props.log.message.slice(index)});
  return pieces;
});

</script>

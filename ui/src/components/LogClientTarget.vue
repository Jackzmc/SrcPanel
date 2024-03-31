<template>
  <a
    @click.ctrl="openStatsProfile"
    @click.exact="setUserFilter"
    :data-tooltip="tooltip"
  >
    {{ user.name }}
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const emit = defineEmits(["set-filter"]);
const route = useRoute();
const router = useRouter();
const props = defineProps(["user", "type"]);

const displayType = computed(() => {
  if (props.type === "client") return "Activator";
  else if (props.type === "target") return "Target";
  return "?";
});

const tooltip = computed(() => {
  let output = `${props.user.steamid}\n${displayType.value}\n\nClick to only see entries from this user.`;
  if (props.user.hasStats) {
    output += `\nCtrl + Click to view stats profile`;
  }
  return output;
});

function openStatsProfile() {
  router.push({
    name: "manage-user",
    params: {
      id: props.user.steamid,
    },
    query: {
      returnTo: route.fullPath
    }
  })
  // window.open(`https://stats.jackz.me/user/${props.user.steamid}/overview`);
}
function setUserFilter() {
  emit("set-filter", props.type, props.user.steamid);
}
</script>

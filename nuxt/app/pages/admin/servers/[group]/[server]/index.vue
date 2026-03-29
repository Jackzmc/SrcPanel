<template>
 {{ groupId }}/{{ serverId }}
</template>

<script setup lang="ts">
const { group: groupId, server: serverId } = useRoute().params;
</script>

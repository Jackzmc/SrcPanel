<template>

</template>

<script setup lang="ts">
const route = useRoute()
navigateTo(`/users/${route.params.steamid}/overview`)
</script>

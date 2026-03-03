<script setup lang="ts">
const route = useRoute()
navigateTo(`/users/${route.params.steamid}/bans/new`, { replace: true })
</script>
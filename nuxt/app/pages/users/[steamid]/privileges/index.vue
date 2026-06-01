<script setup lang="ts">
const route = useRoute()
navigateTo(`/users/${route.params.steamid}/privileges/overview`, { replace: true })
</script>
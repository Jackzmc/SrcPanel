<script setup lang="ts">
const route = useRoute();
navigateTo(`/users/${route.params.steamid}/bans/create`, { replace: true });
</script>

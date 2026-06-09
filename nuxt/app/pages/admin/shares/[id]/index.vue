<script setup lang="ts">
const route = useRoute();
await navigateTo(`/admin/shares/${route.params.id}/files`, { replace: true });
</script>

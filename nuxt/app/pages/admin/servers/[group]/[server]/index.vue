<script setup lang="ts">
const { group: groupId, server: serverId } = useRoute().params;

navigateTo(`/admin/servers/${groupId}/${serverId}/overview`);
</script>

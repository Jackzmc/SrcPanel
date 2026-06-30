<script setup lang="ts">
import type { APIListServersV2_Server } from "@srcpanel/common/Server";

const props = defineProps<{
  servers: APIListServersV2_Server[];
}>();
</script>

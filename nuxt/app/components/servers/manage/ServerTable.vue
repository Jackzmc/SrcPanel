<script setup lang="ts">
import type { APIListServersV2_Server } from "@jzpanel/common/Server";

const props = defineProps<{
  servers: APIListServersV2_Server[];
}>();
</script>

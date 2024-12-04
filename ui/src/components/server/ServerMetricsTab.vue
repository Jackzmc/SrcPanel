<template>
  <div class="box">
    <div class="box" v-for="metric in metrics" :key="metric.collectionTime">
      {{formatDate(metric.collectionTime)}}<br>
      {{metric.cpu_stats?.cpu_usage}}% cpu<br>
      {{metric.memory_stats?.usage_percent}}% mem
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'
import { formatDate, request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';
import { ComputeStats, ServerInfo } from '../../../../common-types/Server';
import { LiveRecordCommandResponse } from '../../../../common-types/Live';

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  server: ServerInfo,
  metrics: ComputeStats[]
}>()

</script>

<template>
  <div class="box">
    <Line :data="cpuDataFormat" :options="cpuOptions" />
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

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  PointElement,
  LinearScale,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement)

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  server: ServerInfo,
  metrics: ComputeStats[]
}>()

const cpuDataFormat = computed(() => {
  return {
    labels: ['CPU %'],
    datasets: [{
        label: 'CPU %',
        data: cpuData.value,
        backgroundColor: 'transparent',
        borderColor: 'red',
        borderWidth: 2
    }]
  }
  
})
const cpuData = computed(() => {
  return props.metrics.map(met => {
    return {
      x: new Date(met.collectionTime*1000),
      y: Math.random() * 100
    }
  })
})

const cpuOptions = computed(() => {
  return {
    title: {
      text: 'CPU Usage %',
      subtext: 'Fake Data',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    data: [
      { value: 1048, name: 'Search Engine' },
      { value: 735, name: 'Direct' },
      { value: 580, name: 'Email' },
      { value: 484, name: 'Union Ads' },
      { value: 300, name: 'Video Ads' }
    ],
    series: [
      {
        name: 'CPU Usage %',
        type: 'line',
        data: [
          { value: 1048, name: 'Search Engine' },
          { value: 735, name: 'Direct' },
          { value: 580, name: 'Email' },
          { value: 484, name: 'Union Ads' },
          { value: 300, name: 'Video Ads' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

</script>

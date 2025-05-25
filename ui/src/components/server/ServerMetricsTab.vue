<template>
<div>
  <div v-if="metrics.length > 0">
    <div class="box">
      <!-- <Line :data="cpuDataFormat" :options="cpuOptions" />`` -->
      <ApexCharts type="line" :series="cpuSeries" :options="cpuOptions" height="300px" />
    </div>
    <div class="box">
      <ApexCharts type="line" :series="memSeries" :options="memOptions" height="300px" />
    </div>
    <div class="box" v-for="(netSeries, i) in networkSeries" :key="i" >
      <ApexCharts type="line" :series="netSeries.series" :options="netSeries.options" height="300px" />
    </div>
  </div>
  <div class="box has-background-info-light" v-else>
    <h4 class="title is-4 has-text-centered my-4">
      <Icon icon="fa-spinner" spin>Waiting for metrics</Icon>
    </h4>
    <p class="subtitle is-5 has-text-centered my-4">
      There are no metrics yet, this will update when metrics are available.
    </p>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Field from '@/components/Field.vue'
import { formatDate, formatSize, request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';
import { ComputeStats, ServerInfo } from '../../../../common-types/Server';
import { Annotation, LiveRecordCommandResponse } from '../../../../common-types/Live';
import ApexCharts from "vue3-apexcharts";

const route = useRoute()
const router = useRouter()

const memMax = computed(() => {
  console.log("triggered")
  if(props.metrics.length === 0) return 0
  return props.metrics[0].memory_stats?.limit ?? 0
})

const props = defineProps<{
  server: ServerInfo,
  metrics: ComputeStats[],
  annotations: Annotation
}>()

const cpuSeries = computed(() => {
  return [
    {
      name: "CPU Usage (%)",
      data: props.metrics
        .filter(met => met.cpu_stats)
        .map(met => [
          met.collectionTime*1000,
          met.cpu_stats!.cpu_usage / met.cpu_stats!.online_cpus
        ])
    }
  ]
})
const memSeries = computed(() => {
  return [
    {
      name: "Memory Usage",
      data: props.metrics
        .filter(met => met.memory_stats != undefined)
        .map(met => [
          met.collectionTime*1000,
          met.memory_stats!.usage
        ])
    }
  ]
})

const cpuOptions = computed(() => {
  return {
    title: {
      text: "CPU Usage (%)"
    },
    xaxis: {
      type: 'datetime',
      labels: {
        formatter: function (value: number, timestamp: number) {
          return new Date(timestamp).toLocaleTimeString()
        },
      }
    },
    yaxis: {
      labels: {
        formatter: function (value: number) {
          return value.toFixed(1) + "%"
        }
      },
      min: 0,
      max: 100
    },
    annotations: {
      xaxis: props.annotations.xaxis,
      yaxis: props.annotations.yaxis,
    }
  }
})

const memOptions = computed(() => {
  return {
    title: {
      text: "Memory Usage"
    },
    stroke: {
      curve: 'stepline',
    },
    xaxis: {
      type: 'datetime',
      labels: {
        formatter: function (value: number, timestamp: number) {
          return new Date(timestamp).toLocaleTimeString()
        },
      }
    },
    yaxis: {
      labels: {
        formatter: function (value: number) {
          return formatSize(value, true)
        }
      },
      min: 0,
      // stepSize: 500000
    },
    annotations: {
      xaxis: props.annotations.xaxis,
      yaxis: [...props.annotations.yaxis,
        {
          y: memMax.value,
          borderColor: '#00E396',
          label: {
            borderColor: '#00E396',
            style: {
              color: '#fff',
              background: '#00E396'
            },
            text: `Memory Limit`
          }
        },
      ]
    }
  }
})

const networkInterfacesIds = computed(() => {
  if(props.metrics.length === 0) return []
  return Object.keys(props.metrics[0].network_stats)
})

const networkSeries = computed(() => {
  return networkInterfacesIds.value.map(intf => {
    return {
      series: [
        {
          name: `Bytes Received`,
          data: props.metrics
            // .filter(met => met.network_stats != undefined)
            .map(met => [
              met.collectionTime*1000,
              met.network_stats[intf].bytesRxRate
            ])
        },
        {
          name: `Bytes Sent`,
          data: props.metrics
            // .filter(met => met.network_stats != undefined)
            .map(met => [
              met.collectionTime*1000,
              met.network_stats[intf].bytesTxRate
            ])
        },
      ],
      options: {
        title: {
          text: `Network Usage (Bytes I/O) [${intf}]`
        },
        // stroke: {
        //   curve: 'stepline',
        // },
        xaxis: {
          type: 'datetime',
          labels: {
            formatter: function (value: number, timestamp: number) {
              return new Date(timestamp).toLocaleTimeString()
            },
          }
        },
        yaxis: {
          labels: {
            formatter: function (value: number) {
              return formatSize(value, true)
            }
          },
          min: 0,
        },
        annotations: {
          xaxis: props.annotations.xaxis,
          yaxis: props.annotations.yaxis,
        }
      }
    }
  })
})
</script>

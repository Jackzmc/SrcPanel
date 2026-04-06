<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <ApexCharts type="line" :series="cpuSeries" :options="cpuOptions" height="300px" />
    </UCard>
    <UCard>
      <ApexCharts type="line" :series="memSeries" :options="memOptions" height="300px" />
    </UCard>
    <UCard v-for="(netSeries, i) in networkSeries" :key="i">
      <ApexCharts type="line" :series="netSeries.series" :options="netSeries.options" height="300px" />
    </UCard>
  </div>

  <ClientOnly>
    <Teleport to="#sidebar">
      <UCard>
        {{ latestMetric }}
      </UCard>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { formatSize } from '@common/methods/format';
import type { ServerDetailed } from '@common/Server';
import type { MetricData, WebsocketExport, WebsocketExportProp } from '~/composables/server/live';
import ApexCharts from "vue3-apexcharts";
import type { ApexOptions } from 'apexcharts';

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExportProp
}>()

const metrics = computed(() => {
  if(!props.ws.metrics) return []
  return props.ws.metrics.stats
})

const latestMetric = computed(() => {
  if(metrics.value.length === 0) return null
  return metrics.value[0]!
})

const annotations = computed(() => {
  console.log(props.ws.metrics, props.ws.metrics.annotations)
  if(!props.ws.metrics) return []
  return props.ws.metrics.annotations
})

const memMax = computed(() => {
  if(metrics.value.length === 0) return 0
  return metrics.value[0]!.memory_stats?.limit ?? 0
})

useHead({
  title: `Metrics - ${props.data.server.name ?? props.data.server.id} - Server Info`
})

const cpuSeries = computed(() => {
  return [
    {
      name: "CPU Usage (%)",
      data: metrics.value
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
      data: metrics.value
        .filter(met => met.memory_stats != undefined)
        .map(met => [
          met.collectionTime*1000,
          met.memory_stats!.usage
        ])
    }
  ]
})

const cpuOptions = computed<ApexOptions>(() => {
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
      xaxis: annotations.value.xaxis,
      yaxis: annotations.value.yaxis,
    }
  }
})

const memOptions = computed<ApexOptions>(() => {
  return {
    title: {
      text: "Memory Usage"
    },
    stroke: {
      curve: 'stepline',
    },
    xaxis: {
      type: 'datetime' as any,
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
      xaxis: annotations.value.xaxis,
      yaxis: [...annotations.value.yaxis,
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
  if(metrics.value.length === 0) return []
  return Object.keys(metrics.value[0]!.network_stats)
})

const networkSeries = computed(() => {
  return networkInterfacesIds.value.map(intf => {
    return {
      series: [
        {
          name: `Bytes Received`,
          data: metrics.value
            // .filter(met => met.network_stats != undefined)
            .map(met => [
              met.collectionTime*1000,
              met.network_stats[intf]!.bytesRxRate
            ])
        },
        {
          name: `Bytes Sent`,
          data: metrics.value
            // .filter(met => met.network_stats != undefined)
            .map(met => [
              met.collectionTime*1000,
              met.network_stats[intf]!.bytesTxRate
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
          xaxis: annotations.value.xaxis,
          yaxis: annotations.value.yaxis,
        }
      } as ApexOptions
    }
  })
})
</script>

<template>
  <Bar v-if="chartData"
    id="my-chart-id"
    :options="chartOptions"
    :data="chartData"
  />
</template>

<script setup lang="ts">
import { ref, onBeforeMount } from 'vue';
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Colors, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import autocolors from 'chartjs-plugin-autocolors';

ChartJS.register(autocolors, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, Colors)

const chartOptions = {
  responsive: true,
  plugins: {
    autocolors: {
      mode: 'data'
    },
    title: {
      display: true,
      text: 'Troll Usages',
    }
  },
}

let chartData = ref()

async function getData() {
  const response = await fetch('/api/graphs/trolls')
  const json = await response.json()
  chartData.value = {
    labels: Object.keys(json),
    datasets: [ {
      label: "Usage",
      data: Object.values(json),
    }]
  }
}

onBeforeMount(() => {
  getData()
})
</script>

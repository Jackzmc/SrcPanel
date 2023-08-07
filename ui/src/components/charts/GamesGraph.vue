<template>
  <Line v-if="chartData"
    :options="chartOptions"
    :data="chartData"
  />
</template>

<script setup lang="ts">
import { ref, onBeforeMount } from 'vue';
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Colors, Title, Tooltip, Legend, LineElement, PointElement, BarElement, CategoryScale, LinearScale } from 'chart.js'
import autocolors from 'chartjs-plugin-autocolors';

ChartJS.register(autocolors, Title, Tooltip, Legend, PointElement, LineElement, CategoryScale, LinearScale, Colors)

const chartOptions = {
  responsive: true,
  plugins: {
    autocolors: {
      mode: 'data'
    },
    title: {
      display: true,
      text: 'Games Played',
    }
  },
}

let chartData = ref()

async function getData() {
  const response = await fetch('/api/graphs/games')
  const json = await response.json()
  chartData.value = {
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

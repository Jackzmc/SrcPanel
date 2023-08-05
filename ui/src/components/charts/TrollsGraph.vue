<template>
  <Bubble v-if="chartData"
    id="my-chart-id"
    :options="chartOptions"
    :data="chartData"
  />
</template>

<script setup lang="ts">
import { ref, onBeforeMount } from 'vue';
import { Bar, Bubble } from 'vue-chartjs'
import { Chart as ChartJS, Colors, Title, Tooltip, Legend, ArcElement, BarElement, PointElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, PointElement, ArcElement, BarElement, CategoryScale, LinearScale, Colors)

const chartOptions = {
  responsive: true
}

let chartData = ref()

async function getData() {
  const response = await fetch('/api/graphs/trolls')
  const json = await response.json()
  chartData.value = {
    labels: Object.keys(json),
    datasets: [ {
      label: "Usage",
      data: Object.values(json)
    }]
  }
}

onBeforeMount(() => {
  getData()
})
</script>

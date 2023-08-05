<template>
<div class="container is-fluid">
  <div class="columns is-multiline">
    <div class="column is-6">
      <div id="bangraph" />
    </div>
    <div class="column is-6">
      <div id="stategraph" />
    </div>
  </div>
  <div class="columns">
    <div class="column is-6">
      <TrollsGraph />
    </div>
  </div>
  <div class="columns">
    <div class="column is-6">
      <div id="slapsbar" />
    </div>
    <div class="column">
      <div id="playtimegraph" />
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TrollsGraph from '@/components/charts/TrollsGraph.vue'

// import Chart from 'highcharts/es-modules/Core/Chart/Chart.js';
// import 'highcharts/es-modules/Series/Line/LineSeries.js';
// import ColumnSeries from 'highcharts/es-modules/Series/Column/ColumnSeries.js';
// import BarSeries from 'highcharts/es-modules/Series/Bar/BarSeries.js';

const TROLL_REGEX = new RegExp(/[^de]activated (constant\s)?troll "([a-zA-Z\s]+)"( with flags=(\d+)\s)?(\s\(?(\d+)?\)? for (.*\((\d+)x\))?)?/)
const COUNT_REGEX = new RegExp(/\((\d+)x\)$/)

async function fetchTrolls() {
  const response = await fetch('/api/graphs/trolls')
  const json = await response.json()
  // const flags = []
  // for(let i = 1; i < 16; i++) {
  //   flags.push({
  //     name: `Flags:${i}`,
  //     type: 'column',
  //     data: Object.values(data).map(d => d[i]).filter(d => d),
  //     showInLegend: false
  //   })
  // }
  new Chart('trollbar', {
    chart: {
      type: 'column',
      zoomType: 'x'
    },
    plotOptions: {
      line: {
        connectNulls: false
      },
      series: {
        stacking: 'normal',
      }
    },
    rangeSelector: {
      selected: 1,
      verticalAlign: 'top',
      x: 0,
      y: 0
    },
    title: {
      text: 'Troll Usage'
    },
    xAxis: {
      categories: Object.keys(json)
    },
    yAxis: {
      title: {
        text: 'Times Applied'
      },

    },
    series: [
      {
        name: 'Default',
        type: 'column',
        data: Object.values(json)
      },
    ]
  });
}
async function fetchSlaps() {
  const response = await fetch('/api/graph?types=ACTION&search_message= slapped ')
  const json = await response.json()
  let data: Record<string,number> = {}
  for(const entry of json.logs) {
    if(!entry.timestamp) continue;
    const match = entry.message.match(COUNT_REGEX)
    const count = match ? Number(match[1]) : 1
    if(!data[entry.clientName]) data[entry.clientName] = 0
    data[entry.clientName] += count
  }
  new Chart('slapsbar', {
    chart: {
      type: 'column',
      zoomType: 'x'
    },
    plotOptions: {
      line: {
        connectNulls: false
      },
      series: {
        stacking: 'normal',
      }
    },
    rangeSelector: {
      selected: 1,
      verticalAlign: 'top',
      x: 0,
      y: 0
    },
    title: {
      text: 'Biggest Slapper'
    },
    xAxis: {
      categories: Object.keys(data)
    },
    yAxis: {
      title: {
        text: 'Slaps'
      },

    },
    series: [
      {
        name: 'Slaps',
        type: 'column',
        data: Object.values(data)
      },
    ]
  });
}
async function fetchStates() {
  const response = await fetch('/api/graph?types=STATE&timestampOnly=1')
  const json = await response.json()
  const incaps: Record<string, number> = {}
  const deaths: Record<string, number> = {}
  for(const entry of json.logs) {
    if(!entry.timestamp) continue;
    const date = new Date(entry.timestamp*1000).toLocaleDateString()
    if(entry.message.includes("incapped")) {
      if(!incaps[date]) {
        incaps[date] = 0
      }
      incaps[date]++
    } else {
      if(!deaths[date]) {
        deaths[date] = 0
      }
      deaths[date]++
    }
  }
  const incapsSeries = Object.entries(incaps)
  const deathsSeries = Object.entries(deaths)
  new Chart('stategraph', {
    chart: {
      zoomType: "x"
    },
    rangeSelector: {
      selected: 1,
      verticalAlign: 'top',
      x: 0,
      y: 0
    },
    title: {
      text: 'States over time'
    },
    xAxis: {
      reversed: true,
      type: 'category',
      title: {
        text: 'Date'
      },
      labels: {
        formatter: function() {
          //@ts-ignore
          return value.value
        },
      },
    },
    yAxis: {
      title: {
        text: 'Count'
      }
    },
    plotOptions: {
      line: {
        pointInterval: 24 * 3600 * 1000,
        type: 'line',
        // dataGrouping: {
        //   groupAll: true,
        //   forced: true,
        //   units: [['week', [1]]]
        // },
        dataLabels: [{
          enabled: true,

        }],
      }
    },
    series: [
      {
        name: 'Incaps',
        type: 'line',
        data: incapsSeries,
      },
      {
        name: 'Deaths',
        type: 'line',
        data: deathsSeries,
        color: 'pink',
      }
    ]
  });
}
async function fetchPlaytime() {
  const response = await fetch('https://jackz.me/l4d2/scripts/analyze.php?stats=playtime')
  const json = await response.json()
  let series: Record<string,any[]> = {
    improved: [],
    reserved: [],
    public: []
  }
  for(const entry of json) {
    const tags = entry.tags.split(",")
    const date = entry.x*1000
    if(tags.includes("server-r")) {
      series.reserved.push([date, entry.y])
    } else if(tags.includes("improved")) {
      series.improved.push([date, entry.y])
    } else if(tags.includes("public")) {
      series.public.push([date, entry.y])
    }
  }
  const seriesGraph = []
  for(const [k, v] of Object.entries(series)) {
    seriesGraph.push({
      name: k,
      type: 'line',
      data: v,
    })
  }
  // console.table(data)
  new Chart('playtimegraph', {
    chart: {
      zoomType: "x"
    },
    rangeSelector: {
      selected: 1,
      verticalAlign: 'top',
      x: 0,
      y: 0
    },
    title: {
      text: 'Campaigns Played (really broken)'
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: 'Date'
      },
      labels: {
        formatter: function() {
          //@ts-ignore
          return new Date(value.value).toLocaleDateString()
        },
      },
    },
    yAxis: {
      title: {
        text: 'Games Played'
      }
    },
    plotOptions: {
      line: {
        pointInterval: 24 * 3600 * 1000,
        type: 'line',
        // dataGrouping: {
        //   groupAll: true,
        //   forced: true,
        //   units: [['week', [1]]]
        // },
        dataLabels: [{
          enabled: true,

        }],
      }
    },
    series: seriesGraph
  });
}
async function fetchBanStat() {
  const response = await fetch('/api/bans/stats')
  const json = await response.json()
  new Chart('bangraph', {
    chart: {
      zoomType: "x"
    },
    plotOptions: {
      line: {
        connectNulls: false,
        pointInterval: 24 * 3600 * 1000,
      }
    },
    rangeSelector: {
      selected: 1,
      verticalAlign: 'top',
      x: 0,
      y: 0
    },
    title: {
      text: 'Bans over time'
    },
    xAxis: {
      // type: 'category',
      // title: {
      //   text: 'Time'
      // },
      type: 'datetime',
      dateTimeLabelFormats: {
        month: '%b',
        year: '%b'
      },
      title: {
          text: 'Date'
      },
      tickInterval: 2,
      labels: {
        formatter: function() {
          //@ts-ignore
          return new Date(value.value).toLocaleDateString()
        },
      }
    },
    yAxis: {
      title: {
        text: 'Count'
      }
    },
    series: [
      {
        name: 'Bans',
        data: json.bans.map((data: any) => [ISOtoUTC(data.x), data.y]),
        type: 'line',

      },
      {
        name: 'Team Killers',
        data: json.tkers.map((data: any) => [ISOtoUTC(data.x), data.y]),
        type: 'line',
        color: 'pink',
      }
    ]
  });
}
function ISOtoUTC(data: string) {
  const [ y, m, d ] = data.split("-")
  return Date.UTC(Number(y), Number(m)-1, Number(d))
}

onBeforeMount(() => {
  // Promise.allSettled([
  //   fetchBanStat(),
  //   fetchStates(),
  // ])
  // Promise.allSettled([
  //   fetchTrolls(),
  //   fetchSlaps(),
  // ]).then(() => fetchPlaytime())
})

</script>

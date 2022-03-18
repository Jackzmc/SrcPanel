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
    <div class="column is-12">
      <div id="trollbar" />
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

<script>
import Chart from 'highcharts/es-modules/Core/Chart/Chart.js';
import LineSeries from 'highcharts/es-modules/Series/Line/LineSeries.js';
import ColumnSeries from 'highcharts/es-modules/Series/Column/ColumnSeries.js';
import BarSeries from 'highcharts/es-modules/Series/Bar/BarSeries.js';

const TROLL_REGEX = new RegExp(/[^de]activated (constant\s)?troll "([a-zA-Z\s]+)"( with flags=(\d+)\s)?(\s\(?(\d+)?\)? for (.*\((\d+)x\))?)?/)
const COUNT_REGEX = new RegExp(/\((\d+)x\)$/)

export default {
  data() {
    return {

    }
  },
  computed: {
  },
  async created() {
    Promise.allSettled([
      this.fetchBanStat(),
      this.fetchStates(),
      this.fetchTrolls(),
      this.fetchSlaps(),
      this.fetchPlaytime()
    ])
  },
  methods: {
    async fetchTrolls() {
      const response = await fetch('https://api.lgs.jackz.me/get-activity.php?all=1&types=ACTION&search_message=activated%20troll&ts-only', {
        headers: { 'X-APIKEY': this.$GRAPH_KEY }
      })
      const json = await response.json()
      let data = {}
      for(const entry of json.logs) {
        if(!entry.timestamp) continue;
        const match = entry.message.match(TROLL_REGEX)
        if(!match) continue;
        const [,,troll,,flags,,count] = match
        flags = Number(flags) || 0
        if(!data[troll]) data[troll] = {}
        if(!data[troll][flags]) data[troll][flags] = 0
        data[troll][flags] += (Number(count) || 1)
      }
      const flags = []
      for(let i = 1; i < 16; i++) {
        flags.push({
          name: `Flags:${i}`,
          type: 'column',
          data: Object.values(data).map(d => d[i]).filter(d => d),
          showInLegend: false
        })
      }
      new Chart('trollbar', {
        chart: {
          type: 'column',
          zoomType: 'x'
        },
        plotOptions: {
          line: {
            connectNulls: false
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
          categories: Object.keys(data)
        },
        yAxis: {
          title: {
            text: 'Times Applied'
          },

        },
        plotOptions: {
          series: {
            stacking: 'normal',
          }
        },
        series: [
          {
            name: 'Default',
            type: 'column',
            data: Object.values(data).map(d => d[0]).filter(d => d),
          },
          ...flags
        ]
      });
    },
    async fetchSlaps() {
      const response = await fetch('https://api.lgs.jackz.me/get-activity.php?all=1&types=ACTION&search_message= slapped ', {
        headers: { 'X-APIKEY': this.$GRAPH_KEY }
      })
      const json = await response.json()
      let data = {}
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
        plotOptions: {
          series: {
            stacking: 'normal',
          }
        },
        series: [
          {
            name: 'Slaps',
            type: 'column',
            data: Object.values(data)
          },
        ]
      });
    },
    async fetchStates() {
      const response = await fetch('https://api.lgs.jackz.me/get-activity.php?all&types=STATE&ts-only', {
        headers: { 'X-APIKEY': this.$GRAPH_KEY }
      })
      const json = await response.json()
      const incaps = {}
      const deaths = {}
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
              return this.value
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
    },
    async fetchPlaytime() {
      const response = await fetch('https://jackz.me/l4d2/scripts/analyze.php?stats=playtime')
      const json = await response.json()
      let series = {
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
              return new Date(this.value).toLocaleDateString()
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
    },
    async fetchBanStat() {
      const response = await fetch('https://jackz.me/l4d2/scripts/bans.php?mode=stats')
      const json = await response.json()
      this.bans = json.bans
      this.tkers = json.tkers
      new Chart('bangraph', {
        chart: {
          zoomType: "x"
        },
        plotOptions: {
          line: {
            connectNulls: false
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
              return new Date(this.value).toLocaleDateString()
            },
          }
        },
        yAxis: {
          title: {
            text: 'Count'
          }
        },
        plotOptions: {
          line: {
            pointInterval: 24 * 3600 * 1000,
          }
        },
        series: [
          {
            name: 'Bans',
            data: json.bans.map(data => [this.ISOtoUTC(data.x), data.y]),
            type: 'line',

          },
          {
            name: 'Team Killers',
            data: json.tkers.map(data => [this.ISOtoUTC(data.x), data.y]),
            type: 'line',
            color: 'pink',
          }
        ]
      });
    },
    ISOtoUTC(data) {
      const [ y, m, d ] = data.split("-")
      return Date.UTC(y, m-1, d)
    }
  }
}
</script>

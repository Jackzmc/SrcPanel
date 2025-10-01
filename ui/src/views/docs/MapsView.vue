<template>
<div class="container ">
  <div class="columns">
    <div class="column">
      <div class="list">
        <div v-for="map in CAMPAIGNS" :key="map.name" class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              {{ map.name }}
            </div>
            <div class="list-item-description is-size-6">
              <span v-for="item,i in map.maps" :key="i" class="mr-2">
                {{ item }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="column is-4">
      <div class="box has-text-centered">
        <!-- <h4 class="title is-4 has-text-centered">Pick a map</h4> -->
        <p><a class="button is-medium" @click="random">Reroll Random Map</a></p>
        <template v-if="randomMap">
          <p class="is-size-3 mt-2">{{ randomMap.name }}</p>
          <p class="is-size-6 mt-2">{{ randomMap.maps[0] }}</p>
        </template>

      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const CAMPAIGNS = [
  {
    name: "Dead Center",
    maps: ["c1m1_hotel", "c1m2_streets", "c1m3_mall", "c1m4_atrium"]
  },
  {
    name: "Dark Carnival",
    maps: ["c2m1_highway", "c2m2_fairgrounds", "c2m3_coaster", "c2m4_barns", "c2m5_concert"]
  },
  {
    name: "Swamp Fever",
    maps: ["c3m1_plankcountry", "c3m2_swamp", "c3m3_shantytown", "c3m4_plantation"]
  },
  {
    name: "Hard Rain",
    maps: ["c4m1_milltown_a", "c4m2_sugarmill_a", "c4m3_sugarmill_b", "c4m4_milltown_b", "c4m5_milltown_escape"]
  },
  {
    name: "The Parish",
    maps: ["c5m1_waterfront", "c5m2_park", "c5m3_cemetery", "c5m4_quarter", "c5m5_bridge"]
  },
  {
    name: "The Passing",
    maps: ["c6m1_riverbank", "c6m2_bedlam", "c6m3_port"]
  },
  {
    name: "The Sacrifice",
    maps: ["c7m1_docks", "c7m2_barge", "c7m3_port"]
  },
  {
    name: "No Mercy",
    maps: ["c8m1_apartment", "c8m2_subway", "c8m3_sewers", "c8m4_interior", "c8m5_rooftop"]
  },
  {
    name: "Crash Course",
    maps: ["c9m1_alleys", "c9m2_lots"]
  },
  {
    name: "Death Toll",
    maps: ["c10m1_caves", "c10m2_drainage", "c10m3_ranchhouse", "c10m4_mainstreet", "c10m5_houseboat"]
  },
  {
    name: "Dead Air",
    maps: ["c11m1_greenhouse", "c11m2_offices", "c11m3_garage", "c11m4_terminal", "c11m5_runway"]
  },
  {
    name: "Blood Harvest",
    maps: ["c12m1_hilltop", "c12m2_traintunnel", "c12m3_bridge", "c12m4_barn", "c12m5_cornfield"]
  },
  {
    name: "Cold Stream",
    maps: ["c13m1_alpinecreek", "c13m2_southpinestream", "c13m3_memorialbridge", "c13m4_cutthroatcreek"]
  },
  {
    name: "Last Stand",
    maps: ["c14m1_junkyard","c14m2_lighthouse"]
  }
]

let randomMap = ref()
function random() {
  const newMap = CAMPAIGNS[Math.floor(Math.random()*CAMPAIGNS.length)]
  // Prevent random chance of last item
  if(newMap.name === randomMap.value?.name) return random()
  randomMap.value = newMap;
}
onMounted(() => {
  random()
})
</script>

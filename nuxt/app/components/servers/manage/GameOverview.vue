<template>
  <UCard :ui="{
    body: '!p-4 !sm:p-6 mx-2 py-0 my-0 !py-1',
    footer: 'p-0! rounded-b-4xl' }
  ">
    <div class="flex gap-4">
      <div  v-if="data.server.status.data" class="min-w-3/12 my-2 border-r border-r-gray-200">
        <h2 v-if="mapDetails?.name" class="text-sm font-bold text-nowrap">{{ mapDetails?.name }}</h2>
        <h2 v-else-if="mapDetails" class="text-sm font-bold text-nowrap">{{ mapDetails.officialMap ? 'Official Map' : 'Custom Map' }}</h2>
        <p class="text-xs text-nowrap">{{ mapDetails?.chapterName }} - Chapter {{ mapDetails?.chapterId }}</p>
        <p v-if="mapDetails" class="text-xs text-nowrap"><code class="p-0! dark:bg-black!">{{ mapDetails.id }}</code></p>
        <p v-else class="text-md text-muted">-</p>
      </div>
      <div v-else class="pr-20 my-2 border-r border-r-gray-200">
        <h2 class="text-sm font-bold text-nowrap">No Data</h2>
        <p class="text-xs text-nowrap">Server offline or unreachable</p>
      </div>
      <div class="flex gap-6 items-center justify-between w-full">
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Gamemode</p>
          <p v-if="data.server.status.data" class="font-semibold text-md">{{ data.server.status.data?.gamemode }}</p>
          <p v-else class="text-md text-muted">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Difficulty</p>
          <p v-if="data.live?.game" class="font-semibold text-md">{{ difficulty }}</p>
          <p v-else class="text-md text-muted">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Players</p>
          <p v-if="ws.playerCount != undefined" class="text-md">
            <span class="font-semibold">{{ ws.playerCount }}</span>
             / 4
          </p>
          <p v-else class="text-md text-muted">-</p>
        </div>
        <div class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">In Voice</p>
          <p class="font-semibold text-md">0</p>
        </div>
      </div>
    </div>
    <template #footer>
      <ClientOnly>
        <div class="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs px-4 py-1 flex justify-between">
          <div v-if="campaignDuration">
            Current campaign duration · {{ campaignDuration }}
          </div>
          <div v-if="finaleStageName">
            Finale · {{ finaleStageName }}
          </div>
          <div v-if="uptime != '-'">
            Server uptime · {{ uptime }}
          </div>
        </div>
      </ClientOnly>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { FinaleStage, GameDifficulty } from '@jzpanel/common/Live';
import { formatRelTimeCompact } from '@jzpanel/common/format';
import type { ServerDetailed } from '@jzpanel/common/Server';
import type { WebsocketExport } from '~/composables/server/live.js';

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExport
}>()

const uptime = computed(() => {
  if (!props.data.live?.game) return '-';
  return formatRelTimeCompact(props.data.live.game.startTime)
})

const campaignDuration = computed(() => {
  if (!props.data.live?.game) return '-';
  return formatRelTimeCompact(props.data.live.game.campaignStartTime)
})

const difficulty = computed(() => {
  if (!props.data.live?.game) return '-';
  switch(props.data.live.game.difficulty) {
    case GameDifficulty.Easy: return "Easy"
    case GameDifficulty.Normal: return "Normal"
    case GameDifficulty.Advanced: return "Advanced"
    case GameDifficulty.Expert: return "Expert"
  }
})

const OfficialCampaignNames = [
  "Dead Center",
  "Dark Carnival",
  "Swamp Fever",
  "Hard Rain",
  "The Parish",
  "The Passing",
  "The Sacrifice",
  "No Mercy",
  "Crash Course",
  "Death Toll",
  "Dead Air",
  "Blood Harvest",
  "Cold Stream",
  "The Last Stand"
]

const FinaleStageName: Record<FinaleStage, string> = {
    [FinaleStage.Gauntlet]: "Gauntlet",
    [FinaleStage.Unknown]: "Not started",
    [FinaleStage.Gauntlet2]: "Gauntlet",
    [FinaleStage.HordeWave1]: "Horde Wave",
    [FinaleStage.FirstBoss]: "First Tank",
    [FinaleStage.GauntletHorde]: "Gauntlet: Horde",
    [FinaleStage.GauntletHordeBonusTime]: "Gauntlet: Over Time",
    [FinaleStage.GauntletHordeBossIncoming]: "Gauntlet: Tank Incoming",
    [FinaleStage.GauntletBoss]: "Gauntlet: Tank",
    [FinaleStage.GauntletEscape]: "Gauntlet: Escape",
    [FinaleStage.GauntletStart]: "Gauntlet",
    [FinaleStage.HordeWave2]: "Horde Wave",
    [FinaleStage.FinalBoss]: "Final Boss",
    [FinaleStage.CustomPanic]: "Panic",
    [FinaleStage.CustomTank]: "Tank",
    [FinaleStage.CustomScripted]: "Scripted",
    [FinaleStage.CustomDelay]: "Intermission",
    [FinaleStage.CustomClearout]: "Clearout",
    [FinaleStage.HordeEscape]: "Horde Escape",
}

const mapDetails = computed(() => {
  if(!props.data.server.status.data?.map) return null
  const match = props.data.server.status.data.map.match(/c(\d{1,2})m(\d)_(.*)/)
  if(match && match.length == 4) {
    return {
      officialMap: true,
      id: props.data.server.status.data?.map,
      name: OfficialCampaignNames[Number(match[1]) - 1],
      chapterId: match[2]!,
      chapterName: match[3]!.charAt(0).toUpperCase() + match[3]!.slice(1)
    }
  }
  return {
    officialMap: false,
    id: props.data.server.status.data?.map
  }
})

const finaleStageName = computed(() => {
  if(!props.data.live?.finale || props.data.live.finale.stage === FinaleStage.Unknown) return null
  return FinaleStageName[props.data.live.finale.stage]
})
</script>

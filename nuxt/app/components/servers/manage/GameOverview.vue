<template>
  <UCard
:ui="{
    body: '!p-4 !sm:p-6 mx-2 py-0 my-0 !py-1',
    footer: 'p-0! rounded-b-4xl' }
  ">
    <div class="grid grid-rows sm:grid-cols-4 gap-0 sm:gap-4">
      <template v-if="isSourceGame">
        <div v-if="mapDetails" class="min-w-3/12 my-2 border-r border-r-gray-200">
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
      </template>
      <div class="flex gap-6 items-center justify-between w-full">
        <div v-if="isSourceGame" class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Gamemode</p>
          <p v-if="gamemode" class="font-semibold text-md">{{ gamemode}}</p>
          <p v-else class="text-md text-muted">-</p>
        </div>
        <div v-if="isSourceGame" class="flex flex-col items-center justify-center">
          <p class="text-xs text-muted">Difficulty</p>
          <p v-if="difficultyText" class="font-semibold text-md">{{ difficultyText }}</p>
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
          <p class="text-xs text-muted min-w-12">In Voice</p>
          <p v-if="props.ws.voiceMembers.value" class="font-semibold text-md text-center">{{ props.ws.voiceMembers.value.length }}</p>
          <p v-else class="text-md text-muted">-</p>
        </div>
      </div>
    </div>
    <template #footer>
      <ClientOnly>
        <div v-if="isSourceGame" class="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-xs px-4 py-1 flex justify-between">
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
  if (!props.ws.live.value?.game) return '-';
  return formatRelTimeCompact(props.ws.live.value?.game.startTime)
})

const campaignDuration = computed(() => {
  if (!props.ws.live.value?.game) return '-';
  return formatRelTimeCompact(props.ws.live.value?.game?.campaignStartTime)
})

const difficultyText = computed(() => {
  if (!props.ws.live.value?.game) return '-';
  switch(props.ws.live.value?.game.difficulty) {
    case GameDifficulty.Easy: return "Easy"
    case GameDifficulty.Normal: return "Normal"
    case GameDifficulty.Advanced: return "Advanced"
    case GameDifficulty.Expert: return "Expert"
  }
})

const isSourceGame = computed(() => {
  return props.data.server.appid === 550
})


const gamemode = computed(() => {
  return props.ws.live.value?.game?.gamemode ?? props.data.server.status.data?.gamemode
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

const mapId = computed(() => {
  return props.ws.live.value?.game?.map ?? props.data.server.status.data?.map
})

const mapDetails = computed(() => {
  if(!mapId.value) return null
  const match = mapId.value.match(/c(\d{1,2})m(\d)_(.*)/)
  if(match && match.length == 4) {
    return {
      officialMap: true,
      id: mapId.value,
      name: OfficialCampaignNames[Number(match[1]) - 1],
      chapterId: match[2]!,
      chapterName: match[3]!.charAt(0).toUpperCase() + match[3]!.slice(1)
    }
  }
  return {
    officialMap: false,
    id: mapId.value
  }
})

const finaleStageName = computed(() => {
  if(!props.ws.live?.value?.finale || props.ws.live?.value.finale.stage === FinaleStage.Unknown) return null
  return FinaleStageName[props.ws.live.value.finale.stage]
})
</script>

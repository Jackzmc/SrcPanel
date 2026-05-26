<template>
  <div class="not-last:border-b border-b-neutral-300">
    <div
      class="flex items-center gap-2 py-2"
    >
      <img :src="imageSrc" alt="character"
        :class="['w-12 h-12 rounded-full border-sold', {
          'opacity-50': !client.isAlive,
          'border-error': !client.isAlive,
          'border-2': !client.isAlive,
          'border': client.isAlive,
          ' border-black': client.isAlive
        }]"
      />
      <!-- TODO: add btn for details / actions -->
      <div class="flex flex-col w-full gap-1">
        <!-- Only show for survivors / infected. Spectators are 'alive' so need to filter-->
        <HealthBarComponent v-if="client.isAlive && !isSpectator" :healthbar="healthbar" />
        <div class="flex justify-between items-center gap-4 text-nowrap">
          <!-- Name row (Name, #uid, BOT, IDLE) -->
          <span class="flex items-center gap-2">
            <span :class="[{'font-bold': client.isAlive, 'line-through': !client.isAlive, 'text-error': !client.isAlive}]">
              {{ client.name }}
            </span>
            <UTooltip text="User ID">
              <span :class="client.isAlive ? 'text-muted' : 'text-error-300'">#{{ client.userid }}</span>
            </UTooltip>
            <UBadge v-if="isBot" size="xs">BOT</UBadge>
            <UBadge v-if="!isBot && (client.state & ClientState.Idle) == ClientState.Idle" size="xs" color="warning">IDLE</UBadge>
          </span>
          <!-- Health text -->
          <span class="flex items-center gap-1">
            <span v-if="client.isAlive" class="text-sm w-20 text-right">
              <b v-if="!client.survivor">{{ healthbar.full.value }}</b>
              <template v-else>
                <b>{{ healthbar.perm.value }} </b>
                <span v-if="healthbar.temp && healthbar.temp.value > 0">
                  + <span class="font-semibold">{{ healthbar.temp.value }}</span>
                </span>
              </template>

              <span v-if="client.infected" class="text-muted"> / {{ healthbar.full.max }}</span>
              <span class="text-muted"> HP</span>
            </span>
            <UBadge v-else size="xs" color="error">Dead</UBadge>
            <UTooltip text="Show details">
              <UButton size="xs" variant="outline" :leading-icon="showDetails ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                @click="showDetails = !showDetails">
              </UButton>
            </UTooltip>
          </span>
        </div>
        <div class="flex justify-between">
          <!-- If dead, just have empty div for spacing-->
          <div v-if="client.isAlive" class="flex text-muted items-center gap-1">
            <!-- <span v-for="state in states" :key="state">{{ state }}</span> -->
            <template v-if="moveState">
              <IconText :leading-icon="moveState.iconLeft" :trailing-icon="moveState.iconRight" :text="moveState.label" />
              <span v-if="playerStates.length > 0">•</span>
            </template>
            <span v-if="playerStates.length > 0">{{ playerStates.join(', ')}}</span>
            <span v-if="items.length > 0">•</span>
            <template v-if="items.length > 0">
              <span class="flex gap-1">
                <UBadge v-for="item in items" :key="item" size="sm" color='neutral' variant="subtle">
                  {{ item }}
                </UBadge>
              </span>
            </template>
          </div>
          <div v-else />
          <!-- Map flow progress on right side -->
          <UTooltip v-if="client.survivor" text="Percentage of progress through map">
           <div class="text-sm">
             <b>{{ Math.round(client.survivor?.flowPercent) }}</b>
             <span class="text-muted">% progress</span>
           </div>
          </UTooltip>
        </div>
      </div>
    </div>
    <div v-if="showDetails" class="bg-light-blue p-3 ml-6 border border-gray-200 flex flex-col gap-4">
      <div>
        <h3 class="text-md font-semibold">Details</h3>
        <KeyValueTable class="my-2">
          <KeyValueRow label="SteamID">
            {{ client.steamid }}
          </KeyValueRow>
          <KeyValueRow label="User ID">
            #{{ client.userid }} <span class="text-sm text-muted float-right">Changes each campaign</span>
          </KeyValueRow>
          <KeyValueRow label="Updated">
            {{ getRelDate(client.timestamp) }}
          </KeyValueRow>
        </KeyValueTable>
      </div>

      <div>
        <h3 class="text-md font-semibold">Actions</h3>
        <div class="flex gap-4 flex-wrap mx-2 py-3">
          <ActionButton v-for="action in actionButtons" :server-id="server.id" :action="action" show-hidden />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClientState, PlayerState, PlayerMove, PlayerGameAction, InfectedClass, type LiveClient } from '@jzpanel/common/Live';
import { IconText } from '#components';
import type { HealthBar } from '#shared/types/server'
import HealthBarComponent from './HealthBar.vue'
import KeyValueTable from '~/components/table/KeyValueTable.vue';
import KeyValueRow from '~/components/table/KeyValueRow.vue';
import { getRelDate } from '@jzpanel/common/format';
import ActionButton from '../ActionButton.vue';
import type { ServerAction, ServerInfo } from '@jzpanel/common/Server';

const props = defineProps<{
  client: LiveClient,
  server: ServerInfo
}>()

const showDetails = ref(false)

const isBot = computed(() => {
  return props.client.steamid == 'BOT'
})

const SURVIVOR_IDS = ["gambler", "producer", "coach", "mechanic", "namvet", "teenangst", "biker", "manager"]
const STATES: { [key in PlayerState]?: string } = {
  [PlayerState.BlackAndWhite]: "Black & White",
  [PlayerState.InSaferoom]: "In Saferoom",
  [PlayerState.IsCalm]: "Calm",
  [PlayerState.IsBoomed]: "Is Boomed"
}

const PlayerGameActionString: Record<PlayerGameAction, string> = {
  [PlayerGameAction.BeingHealed]: "Being Healed",
  [PlayerGameAction.None]: "None",
  [PlayerGameAction.Healing]: "Healing",
  [PlayerGameAction.AmmoPack]: "Deploying Ammo Pack",
  [PlayerGameAction.DefibDefibing]: "Defibbing",
  [PlayerGameAction.GettingDefibed]: "Being Defibbed",
  [PlayerGameAction.DeployIncendiary]: "Deploying Fire Ammo",
  [PlayerGameAction.DeployExplosive]: "Deploying Explosive Ammo",
  [PlayerGameAction.PouringGas]: "Pouring Gascan",
  [PlayerGameAction.Cola]: "Using Cola",
  [PlayerGameAction.Button]: "Pressing button",
  [PlayerGameAction.UsePointScript]: "Pointing",
}

const PlayerMoveData: Record<PlayerMove, { label: string, iconLeft?: string, iconRight?: string }> = {
  [PlayerMove.UnderAttack]: { label: "Pinned", iconLeft: "lucide:triangle-alert" },
  [PlayerMove.Hanging]: { label: "Hanging", iconLeft: "lucide:triangle-alert" },
  [PlayerMove.Incapped]: { label: "Incapped", iconLeft: "lucide:heart-pulse" },
  [PlayerMove.Idle]: { label: "Standing", iconLeft: 'lucide:circle-small' },
  [PlayerMove.Walk]: { label: "Walking", iconRight: "lucide:arrow-big-right" },
  [PlayerMove.Run]: { label: "Moving", iconRight: "lucide:arrow-big-right-dash" },
  [PlayerMove.Crouched]: { label: "Crouching", iconLeft: "lucide:eye-off" },
  [PlayerMove.Ladder]: { label: "Climbing", iconLeft: "lucide:hand" },
}

const imageSrc = computed(() => {
  /* if(!isBot.value) {
    return `/api/users/${props.client.steamid}/avatar`
  } else  */
  /*if(!props.client.isAlive) {
    return '/img/survivors/dead.png'
  } else */if(props.client.infected) {
    if(props.client.infected.class == InfectedClass.Tank) {
      return '/img/survivors/tank.png'
    } else {
      return '/img/survivors/infected.png'
    }
  } else if(props.client.survivor?.survivor != undefined) {
    return `/img/survivors/${SURVIVOR_IDS[props.client.survivor.survivor]}.png`
  }
  return '/img/survivors/random.png'
})

const healthbar = computed<HealthBar>(() => {
  if(!props.client.isAlive) {
    return {
      perm: { value: 0.0, max: 100.0 },
      full: { value: 0.0, max: 100.0 }
    }
  }
  const perm = {
    value: props.client.survivor?.permHealth ?? 0,
    max: props.client.infected?.maxHealth ?? 100.0,
  }
  const temp = props.client.survivor ? {
    value: props.client.survivor.tempHealth,
    max: 100.0,
  } : undefined

  const full = {
    value: perm.value + (temp?.value ?? 0),
    max: perm.max,
  }

  return {
    perm,
    temp,
    full,
  }
})

const moveState = computed(() => {
  if(!props.client.survivor ) return null
  return PlayerMoveData[props.client.survivor.move]
})

const playerStates = computed(() => {
  const states: string[] = []
  if(!props.client.survivor) return states
  for(const [key, label] of Object.entries(STATES)) {
    if(props.client.survivor.states & (key as unknown as PlayerState)) {
      states.push(label)
    }
  }
  if(props.client.survivor.action != PlayerGameAction.None) states.push(PlayerGameActionString[props.client.survivor.action])
  return states
})

const items = computed(() => {
  if(!props.client.survivor?.items) return []
  return props.client.survivor.items
    .filter(item => item != '')
    .map(item => item.replace(/_/g, ' '))
})

const isSpectator = computed(() => {
  return !props.client.infected && !props.client.survivor
})

const actionButtons = computed(() => {
  const actions: ServerAction[] = [
    {
      name: "Kick player",
      command: `sm_kick #${props.client.userid}`,
      permission: 'k',
      description: 'Kick client',
      // If set, prompt for confirmation before executing
      isHidden: true
    }
  ]
  return actions
})
</script>

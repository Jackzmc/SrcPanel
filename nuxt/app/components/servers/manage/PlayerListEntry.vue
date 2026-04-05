<template>
  <div
    class="flex items-center gap-2 not-last:border-b border-b-neutral-300 py-2"
  >
    <img :src="imageSrc" alt="character"
      :class="['w-8 h-8 rounded-full border-sold', {
        'opacity-50': !client.isAlive,
        'border-error': !client.isAlive,
        'border-2': !client.isAlive,
        'border': client.isAlive,
        ' border-black': client.isAlive
      }]"
    />
    <div class="flex flex-col w-full gap-1">
      <span class="text-sm">{{ healthbar }}</span>
      <div class="flex gap-0">
        <UProgress :modelValue="healthbar.perm.value" :min="0" :max="healthbar.perm.value" :color="healthbar.color as any"
          animation="elastic" class="rounded-none p-0 m-0 w-20"
          :style="{ width: `${healthbar.permWidth}%` }"
        />
        <UProgress v-if="healthbar.temp" :modelValue="healthbar.temp.value" :min="0" :max="healthbar.temp.max" :color="healthbar.color as any"
          animation="elastic" :class="['rounded-none p-0 m-0 opacity-25', {'temp-health': healthbar.temp.value > 0 }]"
          :style="{ width: `${healthbar.tempWidth}%` }"
        />
        <!-- <UProgress v-if="healthbar.temp" :modelValue="0" :min="0" :max="100"
          animation="elastic" :class="['rounded-none p-0 m-0 opacity-25']"
          :style="{ width: `${100.0-healthbar.tempWidth}%` }"
        /> -->
      </div>
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
          <UBadge v-if="!isBot && client.state & ClientState.Idle" size="xs" color="warning">IDLE</UBadge>
        </span>
        <!-- Health text -->
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
      </div>
      <div class="flex justify-between">
        <div class="flex text-muted items-center gap-1">
          <!-- <span v-for="state in states" :key="state">{{ state }}</span> -->
          <template v-if="moveState">
            <IconText :leading-icon="moveState.iconLeft" :trailing-icon="moveState.iconRight" :text="moveState.label" />
            ·
          </template>
          <span>{{ playerStates.join(', ')}}</span>
          ·
          <span class="flex gap-1">
            <UBadge v-for="item in items" :key="item" size="sm" color='neutral' variant="subtle">
              {{ item }}
            </UBadge>
          </span>
        </div>
        <!-- Map flow progress on right side -->
        <UTooltip v-if="client.survivor" text="Percent progress through map">
         <div class="flex gap-1">
           <b>{{ Math.round(client.survivor?.flowPercent*100) }}%</b>
         </div>
        </UTooltip>
      </div>
      <div class="flex">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClientState, InfectedClass, PlayerGameAction, PlayerMove, PlayerState, type LiveClient } from '@common/Live';
import { IconText } from '#components';

const props = defineProps<{
  client: LiveClient
}>()

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
  [PlayerMove.Walk]: { label: "Moving", iconRight: "lucide:arrow-big-right" },
  [PlayerMove.Run]: { label: "Running", iconRight: "lucide:arrow-big-right-dash" },
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
  } else if(props.client.survivor?.survivor) {
    return `/img/survivors/${SURVIVOR_IDS[props.client.survivor.survivor]}.png`
  }
  return '/img/survivors/random.png'
})

const maxHealth = computed(() => {
  if(!props.client.isAlive) return 0
  if(props.client.survivor) return props.client.survivor.permHealth
  if(props.client.infected) return props.client.infected.maxHealth || 100
  return props.client.totalHealth
})

const healthbar = computed(() => {
  const perm = {
    value: props.client.survivor?.permHealth ?? 0,
    max: props.client.infected?.maxHealth ?? 100.0,
  }
  const temp = props.client.survivor ? {
    value: props.client.survivor.tempHealth,
    max: 100.0,
  } : null
  const permWidth = Math.ceil(perm.value / perm.max * 100)
  const tempWidth = 100.0 - permWidth

  const perc = (perm.value / perm.max) * 100
  let color = "success"
  if(perc < 10.0) color = "error"
  else if(perc < 30.0) color = "warning"

  const full = {
    value: perm.value + (temp?.value ?? 0),
    max: perm.max,
  }

  return {
    perm,
    temp,
    full,

    permWidth,
    tempWidth,
    color
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
  if(!props.client.survivor || !props.client.survivor.items) return []
  return props.client.survivor.items
    .filter(item => item != '')
    .map(item => item.replace(/_/g, ' '))
})
</script>

<style>
.temp-health {
  height: 100%;
  width: 100%;
  background: #4caf50;
  border-radius: 10px;
  position: relative;
}
.temp-health::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0px,
    transparent 8px,
    #000 11px,
    #000 14px
  );
  background-size: 20px 100%; /* Every 10px creates a 2px wide tick */
  pointer-events: none;
  z-index: 2;
  opacity: 0.50;
}

</style>

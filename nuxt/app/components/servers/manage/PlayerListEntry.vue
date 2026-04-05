<template>
  <div
    class="flex items-center gap-2 not-last:border-b border-b-neutral-300 py-2"
  >
    <img :src="imageSrc" alt="avatar" class="w-8 h-8 rounded-full" />
    <div class="flex flex-col w-full">
      <UProgress :modelValue="currentHealth" :min="0" :max="maxHealth" :color="healthClass" animation="elastic" />
      <span class="flex items-center gap-1">
        <span :class="{'font-bold': client.isAlive, 'line-through': !client.isAlive}">
          {{ client.name }}
        </span>
        <UBadge v-if="!client.isAlive" size="xs" color="error">Dead</UBadge>
        <UBadge v-if="isBot" size="xs" >BOT</UBadge>
      </span>
    </div>
    t={{ client.totalHealth }} p={{client.survivor?.permHealth}} h={{client.infected?.health}}
    mh={{ client.infected?.maxHealth }}

    _c={{currentHealth}} _m={{maxHealth}}
    <!-- {{ client }} -->
  </div>
</template>

<script setup lang="ts">
import { InfectedClass, type LiveClient } from '@common/Live';

const props = defineProps<{
  client: LiveClient
}>()

const isBot = computed(() => {
  return props.client.steamid == 'BOT'
})

const SURVIVOR_IDS = ["gambler", "producer", "coach", "mechanic", "namvet", "teenangst", "biker", "manager"]

const imageSrc = computed(() => {
  if(!isBot.value) {
    return `/api/users/${props.client.steamid}/avatar`
  } else if(!props.client.isAlive) {
    return '/img/survivors/dead.png'
  } else if(props.client.infected) {
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

const currentHealth = computed(() => {
  if(!props.client.isAlive) return 0
  if(props.client.survivor) return props.client.totalHealth
  if(props.client.infected) return props.client.infected.health
  return props.client.totalHealth
})

const maxHealth = computed(() => {
  if(!props.client.isAlive) return 0
  if(props.client.survivor) return props.client.survivor.permHealth
  if(props.client.infected) return props.client.infected.maxHealth || 100
  return props.client.totalHealth
})

const healthPercent = computed(() => {
  return (currentHealth.value / maxHealth.value) * 100
})

const healthClass = computed(() => {
  if (currentHealth.value <= 10) return 'error'
  if (healthPercent.value <= 50) return 'warning'
  return 'success'
})
</script>

<template>
  <div>
    <NuxtPage />
    <Hero title="Cvars" subtitle="All the cvars you may want to change up the gameplay" />
    <UContainer>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:order-1 order-2">
          <UContainer>
            <UInput v-model="searchQuery" class="w-full" icon="i-lucide-search" placeholder="Search for a cvar" />
          </UContainer>
          <ul class="py-6">
            <li v-for="cvar in filteredCvars" :key="cvar.name" class="p-1 hover:bg-neutral-100 hover:dark:text-black w-full text-left">
              <strong class="text-lg font-semibold">
                {{ cvar.name }} <CmdArg v-if="cvar.arg" :arg="cvar.arg.name" required :type="cvar.arg.type" />
              </strong>
              <div class="text-sm">{{ cvar.description }}</div>
            </li>
          </ul>
        </div>
        <div class="space-y-6 sm:order-2 order-1">
          <UCard class="bg-light-blue">
            <h3 class="text-xl font-semibold">
              Cvar Info
            </h3>
            <p class="py-3">
               Convars (cvars for short) are settings on the server that can affect anything such as gameplay or plugin settings and can be changed at any time.
            </p>
            <p class="py-3">
              Some convars will reset back to their configured value on the next chapter, and some will only reset when the server restarts.
            </p>
            <UCard>
              <p class="pb-3">You can change convars with one of these commands:</p>
              <table class="w-full table-auto">
                <tbody>
                  <tr class="border-b border-gray-300">
                    <td class="py-2">sm_cvar</td>
                    <td class="py-2 space-x-2">
                      <CmdArg required arg="cvar name" type="text" />
                      <CmdArg arg="value" type="any" />
                    </td>
                    <td class="py-2">in the dev console</td>
                  </tr>
                  <tr class="border-b border-gray-300">
                    <td class="py-2">!cvar</td>
                    <td class="py-2 space-x-2">
                      <CmdArg required arg="cvar name" type="text" />
                      <CmdArg arg="value" type="any" />
                    </td>
                    <td class="py-2">in chat (publicly)</td>
                  </tr>
                  <tr class="border-b border-gray-300">
                    <td class="py-2">/cvar</td>
                    <td class="py-2 space-x-2">
                      <CmdArg required arg="cvar name" type="text" />
                      <CmdArg arg="value" type="any" />
                    </td>
                    <td class="py-2">in chat (privately)</td>
                  </tr>
                </tbody>
              </table>
              <p class="pt-3">If a value is not specified, it will instead show you the current value of the cvar </p>
            </UCard>
            <p class="py-3">
              Percentages are represented by decimals, so 100% would be entered as <code>1.0</code>, 50% = <code>0.5</code>, 0% = <code>0</code>
            </p>
            <p class="py-3">
              <b>Example</b> <code>/cvar l4d2_population_clowns 1.0</code> – This will make it a 100% chance it spawns clown zombies
            </p>
            <p class="py-3 text-sm">
              <em>Nerd shit: Cvars can take three types of inputs: floats, integers, and strings. Booleans are represented by 0 or 1 but using the sm_cvar command allows you to input anything, and this can do unknown behavior.
              0.0 or 1.0 is a float but can also be parsed as an integer or a string. Just be careful with the parameters.</em>
            </p>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Cvars - Docs"
})
import Hero from '~/components/Hero.vue'
import { parseCommandString } from '@common/methods/cmds/util'
import CmdArg from "~/components/commands/CmdArg.vue"

import CVAR_DATA from '~/assets/data/cvars.json'
const cvars = CVAR_DATA as RawCvar[]

interface RawCvar {
  cvar: string,
  description: string,
  default?: any
}

const searchQuery = ref<string>("")

const parsedCvars = computed(() => {
  if(!cvars) return []
  return cvars.map(cvar => {
    const result = parseCommandString(cvar.cvar)
    return {
      name: result.name,
      description: cvar.description,
      default: cvar.default,
      arg: result.params[0]
    }
  })
})

const filteredCvars = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if(!query) return parsedCvars.value
  return parsedCvars.value
    .filter(cvar => cvar.name.toLowerCase().includes(query) || cvar.description.toLowerCase().includes(query))
})
</script>

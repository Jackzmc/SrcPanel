<template>
  <div>
    <!-- TODO: re add permission check -->
    <NuxtPage />
    <UContainer class="space-y-2">
      
      <div class="grid grid-cols-3 gap-4">
        <!-- Left Column-->
        <div class="col-span-2">
          <div class="flex flex-col gap-2">
            <UTabs
v-model="view"
:items="items"
:content="false"
class="w-full"
              size="md"
            />
            <UInput v-model="searchQuery" class="w-full" icon="lucide:search" placeholder="Search for an item" />
          </div>
          <div v-if="view == 'trolls'">
            <div v-for="(trolls, category) in filtered" :key="category" class="py-2">
              <h3 class="text-xl font-semibold text-primary">
                {{ category }}
              </h3>
              <ul>
                <li v-for="troll in trolls" :key="troll.name">
                  <button class="p-1 hover:bg-neutral-100 hover:dark:text-black w-full text-left cursor-pointer">
                    <strong>
                      {{ troll.name }}
                    </strong>
                    <div class="text-sm">{{ troll.description }}</div>
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div v-else-if="view == 'combos'">
            <div v-for="(list, combo) in filtered" :key="combo" class="py-2">
              <h3 class="text-xl font-semibold text-primary">
                {{ combo }}
              </h3>
              <ul>
                <li v-for="troll in list" :key="troll" class="mx-2">
                  {{ troll }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <!-- Right Sidebar -->
        <div>
          <UCard>
            <p>You can apply trolls to any player for punishing and messing with them, by using the <ULink to="/docs/commands/fta" class="text-info font-bold">fta</ULink> command</p>
            <br>
            <p>Click on any troll name to view the prompts the troll has for customization</p>
            <br>
            <p>Troll combinations are list of trolls that are activated all at once when the combination is invoked</p>
            <br>

          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { SelectMenuItem, TabsItem } from '@nuxt/ui'
import Hero from '~/components/Hero.vue'

import FTT_DATA from '~/assets/data/ftt.json'
useHead({
  title: "Feed The Trolls"
})
definePageMeta({
  title: "Feed The Trolls",
  description: "The anti-troll arsenal",
  hero: "default"
})
const data = FTT_DATA as FttData

interface FttData {
  trolls: Record<string, {
    name: string,
    description?: string,
    modes?: string[],
    subnotes?: string[],
    prompts?: {
      flags: string[],
      multiple?: boolean,
      conditions?: string[]
    }[]
  }[]>,
  combos: Record<string, string[]>
}

const items: TabsItem[] = [
  {
    label: "Trolls",
    value: "trolls"
  },
  {
    label: "Combos",
    value: 'combos'
  }
]

const searchQuery = ref<string>("")
const view = ref<"combos"|"trolls">("trolls")

const filtered = computed(() => {
  if(!data) return []
  if(view.value == "combos") {
    if(!searchQuery.value) return data.combos
    const query = searchQuery.value.toLowerCase()
    return Object.fromEntries(Object.entries(data.combos)

      .filter(([key, list]) => {
        return key.toLowerCase().includes(query)
          || list.some(item => item.toLowerCase().includes(query))
      }))
  } else if(view.value == "trolls") {
    if(!searchQuery.value) return data.trolls
    const query = searchQuery.value.toLowerCase()
    return Object.fromEntries(Object.entries(data.trolls)
      // Return for each category list of filtered out trolls
      .map(([category, trolls]) => {
        const list = trolls.filter(troll => {
          return troll.name.toLowerCase().includes(query)
            || troll.description?.toLowerCase().includes(query)
        })
        return [category, list]
      })
      // Only include categories that have items
      .filter(([category, trolls]) => {
        return trolls!.length > 0
      }))
  }
})


// // Lets server fetch in SSR
// const baseURL = import.meta.server
//   ? useRequestURL().origin
//   : useRuntimeConfig().app.baseURL
// const { data, error } = await useFetch<FttData>(`/data/ftt.json?t=${__BUILD_DATE__}`, { key: "ftt", immediate: true, baseURL,  })

// const router = useRouter()
// function showCmd(cmd: Command) {
//   router.push(`/docs/commands/${cmd.name}`)
// }
</script>

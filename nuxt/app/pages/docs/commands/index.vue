<template>
  <div>
    <Hero title="Commands" subtitle="All the information to have fun, and manage those troublemakers" />
    <UContainer>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <UContainer>
            <UInput class="w-full" icon="i-lucide-search" placeholder="Search for a command" />
          </UContainer>
          <div class="bg-error-50 p-6 my-6" v-if="error">
            {{ error }}
          </div>
          <div v-for="(group, groupId) in groups" :key="groupId" class="py-6">
            <h3 class="text-xl font-semibold text-center text-primary">
              {{ group.name }}
            </h3>
            <ul>
              <li v-for="(cmd, i) in group.commands" :key="i" >
                <button href="#" class="p-2 hover:bg-neutral-100 w-full text-left cursor-pointer">
                  <strong>
                    <template v-if="!cmd.consoleOnly && !cmd.hidePrefix">
                      {{ cmdPrefix }}
                    </template>{{ cmd.command }}
                  </strong>
                  <div class="text-sm">{{ cmd.description }}</div>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="space-y-6">
          <UCard>
            <UCheckbox v-model="showLockedCommands" label="Show all commands" />
          </UCard>
          <UCard class="bg-primary-50">
            <h3 class="text-lg font-semibold">
              I want to enter commands via
              <USelect v-model="cmdPrefix" :items="VISIBILITIES" class="w-48" />
            </h3>
            <p>There are three different methods to input commands:</p>
            <ol class="list-disc list-inside">
              <li>From the dev console, usually with the prefix <code>sm_</code></li>
              <li>In the chat, publicly by using <code>!</code></li>
              <li>In chat, privately by using <code>/</code> (forward slash)
                <UBadge class="ml-1" color="neutral">
                  Recommended
                </UBadge>
              </li>
            </ol>
          </UCard>
          <UCard class="bg-primary-50">
            <h3 class="text-lg font-semibold">
              Parameter Info
            </h3>
            <UCard>
              <ul class="list-disc list-inside">
                <li>
                  Parameters are separated by spaces. If you want to have spaces for a parameter, surround it with "quotes around
                  the word".
                </li>
                <li>
                  <UBadge color="info">
                    &lt;&gt;
                  </UBadge> indictates the argument is <u>required.</u>
                </li>
                <li>
                  <UBadge variant="outline" color="neutral">
                    [&nbsp;]
                  </UBadge> indictates the argument is <em>optional</em>.
                </li>
                <li>
                  <b>Do not</b> include the symbols <UBadge color="info">
                    &lt;&gt;
                  </UBadge> or <UBadge variant="outline" color="neutral">
                    [&nbsp;]
                  </UBadge> as
                  they are just used to indicate if the parameter is required or not.
                </li>
              </ul>
            </UCard>
            <p class="py-4">
              When selecting a player, you only need to put enough of their name that uniquely identifies them. If there is no other player that name starts with 'ja', then you could use that to select 'jackz', if you wanted to select jockey, you could do 'ey'.
            </p>
            <p>
              See <ULink to="/docs/targetting" class="text-primary">
                Advanced Targetting
              </ULink> docs for more information and examples
            </p>
          </UCard>
          <UCard variant="subtle">
            <h3 class="text-lg font-semibold">
              Examples
            </h3>
            <ol class="list-decimal list-inside">
              <li>
                <CmdArg required>user</CmdArg> means a required user while <CmdArg>user</CmdArg> means an optional user.
              </li>
              <li>
                I want to kick jackz, the command is <code>{{ cmdPrefix }}kick &lt;player&gt; [reason]</code>, I don’t need to input a reason so I will just type in: <code>{{ cmdPrefix }}kick jackz</code></li>
              <li>I want to kick a troll, and I want to state why. <code>{{ cmdPrefix }}kick JimmyTheTroll "goodbye troll"</code></li>
              <li>
                I want to respawn disgruntled pea, the problem is that he has a space in his name. You can either:
                <ol type="a" class="px-6 list-alphabetic list-inside">
                  <li>Surround his name with quotes, “Disgruntled pea”</li>
                  <li>Only mention part of his name (disgruntled, or pea):
                    <br><code>/respawn “disgruntled pea”</code> or <code>/respawn disgruntled</code> or even <code>/respawn pea</code>
                  </li>
                </ol>
                <br>
              </li>
            </ol>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import Hero from '~/components/Hero.vue'
import CmdArg from '~/components/commands/CmdArg.vue'
import type { SelectItem } from '@nuxt/ui'

interface CommandGroup {
  name: string
  commands: {
    command: string
    description?: string
    perm?: string
    consoleOnly?: boolean
    hidePrefix?: boolean
  }[]
}
type CommandData = Record<string, CommandGroup>

declare const __BUILD_DATE__: string



const VISIBILITIES: SelectItem[] = [
  { value: "sm_", label: "console" },
  { value: "/", label: "chat, privately" },
  { value: "!", label: "chat, publicly" }
]
const cmdPrefix = ref<string>("/")
const showLockedCommands = ref<boolean>(false)

// Lets server fetch in SSR
const baseURL = import.meta.server
  ? useRequestURL().origin
  : useRuntimeConfig().app.baseURL
const { data: groups, error } = await useFetch<CommandData>(`/data/commands.json?t=${__BUILD_DATE__}`, { key: "commands", immediate: true, baseURL })

</script>

<template>
<!--   -->
  <UModal
    open
    :title="prefix + cmd.name"
    :description="cmd.description"
    @update:open="emit('close')"
  >
     <template #header>
      <div>
        <h2 class="font-semibold">{{ prefix + cmd.name }}</h2>
        <p class="text-sm text-gray-500">{{ cmd.description }}</p>
      </div>
    </template>
    <template #body>
      <div class="space-y-10">
        <!-- Aguments -->
        <div v-if="cmd.args.length > 0" class="space-y-1">
          <h3 class="font-semibold">Arguments</h3>
          <div class="m-2 px-2 p-2 bg-neutral-100">
            <table class="my-1 w-full table-auto">
              <thead>
                <tr class="text-left border-b border-gray-300">
                  <th class="pb-2">Name</th>
                  <th class="pb-2">Type</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(arg, i) in cmd.args" :key="i" class="border-b border-gray-300">
                  <td class="py-2"><CmdArg :arg="arg.name" :required="arg.required" /></td>
                  <td class="py-2">{{ arg.type }}</td>
                </tr>

              </tbody>
            </table>
          </div>
          <div class="m-2 p-2 bg-primary-200 grid grid-cols-2">
            <div><CmdArg required>parameter</CmdArg> is required</div>
            <div class="text-right"><CmdArg>parameter</CmdArg> is optional</div>
          </div>
        </div>

        <div v-if="cmd.examples?.length" class="space-y-1">
          <h3 class="font-semibold">Examples</h3>
          <div class="px-2 py-2">
            <ul class="list-disc list-inside text-sm space-y-1">
              <!-- eslint-disable vue/no-v-html -->
              <!-- okay: pulled from commands.json -->
              <li v-for="(example, i) in examples" :key="i" v-html="example" />
              <!-- eslint-enable vue/no-v-html -->
            </ul>
          </div>
        </div>

        <div v-if="cmd.perm">
          <h3 class="font-semibold">Required Permission</h3>
          <div class="px-2 py-2">
            <UBadge color="neutral">{{ cmd.perm }}</UBadge>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Command } from '@jzpanel/common/methods/cmds/util';
import CmdArg from './CmdArg.vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const props = withDefaults(
  defineProps<{
    cmd: Command,
    prefix?: string
  }>(),
  { prefix: "/" }
)

const examples = computed(() => {
  if(!props.cmd.examples) return
  return props.cmd.examples.map(ex => {
    return ex
      .replace(/%cmd%/g, props.cmd.name)
      .replace(/%prefix%/g, props.prefix)
  })
})
</script>

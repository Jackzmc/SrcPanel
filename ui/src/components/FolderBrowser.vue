<template>
<aside class="menu my-1">
  <template v-for="(data, folder) in folders" :key="folder">
    <p class="menu-label my-1">
      <a :class="{'has-text-black': !data.active, 'has-text-light': data.active, 'is-link': data.active, tag: true}" @click="data.active = !data.active">{{folder}}/</a>
    </p>
    <ul class="menu-list my-1" v-if="data.active">
      <li v-if="data.files.length === 0"><a class="has-text-black has-text-centered" disabled><em>Directory is empty</em></a></li>
      <li v-for="file in data.files" :key="file">
        <a @click="emit('select', { file, folder })">{{file}}</a>
      </li>
    </ul>
  </template>
</aside>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
const emit = defineEmits(["select"])

const props = defineProps<{
  paths: string[]
}>()

let folders = ref<Record<string, { files: string[], active: boolean}>>()

watchEffect(() => {
  folders.value = {'_root': { files: [], active: true }}
  for(const path of props.paths) {
    const split = path.split('/')
    if(split.length > 1) {
      const parent = split.slice(0, split.length - 1).join("/")
      if(!folders.value[parent]) folders.value[parent] = { files: [], active: false }
      folders.value[parent].files.push(split.pop() as string)
    } else {
      folders.value['_root'].files.push(path)
    }
  }
  // Push files below all folders
  folders.value[''] = folders.value['_root']
  delete folders.value['_root']
})
</script>

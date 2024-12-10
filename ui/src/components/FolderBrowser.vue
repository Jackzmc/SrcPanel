<template>
<aside class="menu">
  <template v-for="(data, folder) in folders" :key="folder">
    <ul class="menu-list">
      <li>
        <a
          @click="selectFolder(folder)">
          <Icon icon="folder">{{folder}}/</Icon>
        </a>
      </li>
      <template v-if="data.active">
        <li v-if="data.files.length === 0"><a class="ml-5 has-text-black has-text-centered" disabled><em>Directory is empty</em></a></li>
        <li v-for="entry in data.files" :key="entry.path" class="ml-5">
          <a @click="selectFile(entry)" :class="{'is-active': selected === entry }">
            <Icon icon="file-alt">{{entry.filename}}</Icon>
          </a>
        </li>
      </template>
    </ul>
  </template>
</aside>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
const emit = defineEmits(["select"])

let selected = ref()

const props = defineProps<{
  paths: string[]
}>()

function selectFile(entry: FolderEntry) {
  selected.value = entry
  emit('select', entry)
  console.log("selected", entry)
}

function selectFolder(selectedFolder: string) {
  if(!folders.value) return
  for(const [folder, data] of Object.entries(folders.value)) {
    if(folder === selectedFolder) {
      data.active = !data.active
    }
  }
}

interface FolderEntry {
  path: string,
  // The display name, without the parent prefix
  filename: string
}

let folders = ref<Record<string, { files: FolderEntry[], active: boolean}>>()

watchEffect(() => {
  folders.value = {'_root': { files: [], active: true }}
  for(const path of props.paths) {
    const split = path.split('/')
    if(split.length > 1) {
      const parent = split.slice(0, split.length - 1).join("/")
      if(!folders.value[parent]) folders.value[parent] = { files: [], active: false }
      folders.value[parent].files.push({ path, filename: split.pop() as string })
    } else {
      folders.value['_root'].files.push({ path, filename: path })
    }
  }
  // Push files below all folders
  folders.value[''] = folders.value['_root']
  delete folders.value['_root']
})
</script>

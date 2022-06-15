<template>
  <div class="container ">
    <div class="columns">
      <div class="column is-2" />
      <div class="column is-6">
        <div class="content" v-html="html" />
      </div>
      <div class="column content" v-if="headersTree">
        <h4>Sections</h4>
        <SectionRoot :node="headersTree.root" />
      </div>
    </div>
    <br>
  </div>
</template>

<script setup lang="ts">
//@ts-ignore
import Marked from 'marked'
import { Tree, TreeNode } from '@/js/Tree'
import { ref, onBeforeMount } from 'vue'
import SectionRoot from '@/components/sections/SectionRoot.vue'

const LAST_UPDATED = new Date(Number(process.env.VUE_APP_BUILD_DATE))

let html = ref<string>()
let headersTree = ref<Tree>()

onBeforeMount(() => {
  fetch(`../data/plugins.md?t=${LAST_UPDATED}`)
  .then(response => {
    if(response.ok)
      return response.text()
    else
      html.value = "<p class='has-text-danger'>Could not fetch information.</p>"
  })
  .then(text => {
    html.value = Marked(text)
    const tree = new Tree(0, 0)
    let lastNode: TreeNode | null = null
    for (let [,rawLevel,name] of html.value!.matchAll(/h(\d) id="(.+)"/g) as any) {
      const level = Number(rawLevel)
      let newNode: TreeNode | null = null;
      if(lastNode && level > lastNode.value) {
        newNode = tree.insert(lastNode.key, name, level)
      } else if(lastNode && level === lastNode.value) {
        newNode = tree.insert(lastNode.parent!.key, name, level)
      } else {
        newNode = tree.insert(0, name, level)
      }
      lastNode = newNode
    }
    headersTree.value = tree
  })
})
</script>

<template>
  <div class="container">
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
import { marked } from 'marked'
import { Tree, TreeNode } from '@/js/Tree'
import { ref, onBeforeMount } from 'vue'
import SectionRoot from '@/components/sections/SectionRoot.vue'

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))

let html = ref<string>()
let headersTree = ref<Tree>()
interface Node {
  level: number,
  name: string | null
  children: Node[]
}
onBeforeMount(async () => {
  const response = await fetch(`/data/plugins.md?t=${LAST_UPDATED}`)
  if(response.ok) {
    const text = await response.text()
    html.value = marked(text)
    const headers = html.value!.matchAll(/h(\d) id="(.+)"/g)

    const tree = new Tree(0, 0)
    let lastNode: TreeNode | null = null
    for (let [,rawLevel,name] of headers) {
      const level = Number(rawLevel)
      let newNode: TreeNode | null = null;
      if(lastNode && level > lastNode.value) {
        newNode = tree.insert(lastNode.key, name, level)
      } else if(lastNode) {
        // Traverse upwards until we find the next level to insert us into
        let parent = lastNode.parent
        while(parent) {
          if(parent.value < level) {
            newNode = tree.insert(parent.key, name, level)
            break;
          }
          parent = parent.parent
        }
      } else {
        newNode = tree.insert(0, name, level)
      }
      lastNode = newNode
    }
    console.log(tree)
    headersTree.value = tree
  }
})
</script>

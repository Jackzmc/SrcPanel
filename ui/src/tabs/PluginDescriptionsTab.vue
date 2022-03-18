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

<script>
import Marked from 'marked'
import { Tree, TreeNode } from '@/js/tree.js'
import SectionRoot from '@/components/sections/SectionRoot.vue'

export default {
  components: {
    SectionRoot
  },
  data() {
    return {
      html: null,
      headersTree: null
    }
  },
  created() {
    fetch('./data/plugins.md?timestamp=' + this.$LAST_UPDATED)
    .then(response => {
      if(response.ok)
        return response.text()
      else
        this.html = "<p class='has-text-danger'>Could not fetch information.</p>"
    })
    .then(text => {
      this.html = Marked(text)
      const tree = new Tree(0, 0)
      let lastNode
      for (const [,level,name] of this.html.matchAll(/h(\d) id="(.+)"/g)) {
        level = Number(level)
        let newNode;
        if(lastNode && level > lastNode.value) {
          newNode = tree.insert(lastNode.key, name, level)
        } else if(lastNode && level === lastNode.value) {
          newNode = tree.insert(lastNode.parent.key, name, level)
        } else {
          newNode = tree.insert(0, name, level)
        }
        lastNode = newNode
      }
      this.headersTree = tree
    })
  }
}

function recurseDown(){}
</script>

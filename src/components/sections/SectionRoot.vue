<template>
<ul v-if="node.children.length > 0">
    <SectionNode v-for="child in node.children" :key="child.key" :node="child" />
</ul>
</template>

<script type="text/javascript">

import SectionNode from '@/components/sections/SectionNode.vue'

export default {
  components: {
    SectionNode
  },
  name: "SectionRoot",
  props: {
    node: Object
  },
  methods: {
    gotoHeader() {
      const element = document.getElementById(this.node.key)
      if(element) element.scrollIntoView()
      else console.warn(`Element not found: ${this.node.key}`)
    }
  }
};

</script>


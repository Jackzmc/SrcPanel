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
  }
};

</script>


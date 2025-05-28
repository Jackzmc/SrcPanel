<template>
<component :is="component" :class="['list-item',{'has-background-info-light': selected}]" @click="select">
  <div class="list-item-content">
    <div class="list-item-title">{{ group.name }}</div>
    <div class="list-item-description">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <div class="tags has-addons">
              <span class="tag is-dark">Game</span>
              <span class="tag is-info">{{ group.game }}</span>
            </div>
          </div>
          <div class="level-item">
            <div class="tags has-addons">
              <span class="tag is-dark"># Instances</span>
              <span class="tag is-info">{{ group.currentInstances }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GroupInfo } from '../../../../common-types/Server.js';

const emit = defineEmits(["select"])

const props = defineProps<{
  group: GroupInfo,
  selected: boolean,
  selectable: boolean
}>()

const component = computed(() => {
  return props.selectable ? "a" : "div"
})

function select() {
  if(!props.selectable) return
  emit("select")
}
</script>

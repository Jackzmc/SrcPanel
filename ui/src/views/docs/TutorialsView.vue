<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <template v-if="selectedTutorial">
        <h4 class="title is-4">{{ selectedTutorial.title }}</h4>
        <video :src="selectedTutorial.videoSrc" controls autoplay />
      </template>
      <template v-else>
        <h4 class="title mt-6 is-4 has-text-centered">No tutorial selected</h4>
        <p class="subtitle has-text-centered">
          Select a tutorial on the right
        </p>
      </template>
    </div>
    <div class="column">
      <nav class="panel is-info">
        <p class="panel-heading">
          Tutorials
        </p>
        <div class="panel-block">
          <p class="control has-icons-left">
            <input v-model="searchQuery" class="input" type="text" placeholder="Search">
            <Icon icon-class="is-left" icon="fa-search" />
          </p>
        </div>
        <a :class="['panel-block', {'is-active': selectedTutorial == tutorial}]" v-for="tutorial in filteredTutorials" :key="tutorial.title" @click="selectTutorial(tutorial)">
          <span class="panel-icon">
            <FontAwesomeIcon v-if="tutorial.type === 'video'" icon="fa-video" />
          </span>
          {{ tutorial.title }}
        </a>
        <div class="panel-block has-text-grey">
          {{ tutorials.length }} tutorials found
        </div>
      </nav>
      <div class="box content" v-if="selectedTutorial?.description">
        <h4 class="title is-4">Tutorial Description</h4>
        <p>{{ selectedTutorial.description }}</p>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

interface Tutorial {
  title: string,
  videoSrc: string,
  type: "video",
  description?: string
}
const TUTORIALS: Tutorial[] = [
  {
    title: "5 Player Tutorial Video",
    videoSrc: "https://cdn.jackz.me/videos/tutorial-8player.mp4",
    type: "video"
  },
  {
    title: "Addon Installing Video",
    videoSrc: "https://i.jackz.me/2023/09/DimwittedVuByh.mp4",
    type: "video",
    description: "Dummy"
  }
]
let tutorials = ref<Tutorial[]>(TUTORIALS)
let searchQuery = ref()
const filteredTutorials = computed(() => {
  if(!searchQuery.value) return tutorials.value
  const query = searchQuery.value.toLowerCase()
  return tutorials.value.filter(tut => {
    return tut.title.toLowerCase().includes(query)
  })
})
let selectedTutorial = ref<Tutorial>()

function selectTutorial(tutorial: Tutorial) {
  selectedTutorial.value = tutorial
}
</script>

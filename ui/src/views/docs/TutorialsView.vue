<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <template v-if="selectedTutorial">
        <h4 class="title is-4">{{ selectedTutorial.title }}</h4>
        <video v-if="selectedTutorial.videoSrc" :src="selectedTutorial.videoSrc" controls autoplay />
        <span class="content box" v-if="htmlContent" v-html="htmlContent"></span>
      </template>
      <template v-else>
        <h4 class="title mt-6 is-4 has-text-centered">Select a tutorial</h4>
        <p class="subtitle has-text-centered">
          No tutorial selected, select a tutorial from the box on the right.
        </p>
      </template>
    </div>
    <div class="column">
      <nav class="panel is-info">
        <p class="panel-heading">
          Tutorials
        </p>
        <div class="panel-block" v-if="!tutorials">
          <Icon icon="spinner" spin>Loading tutorials...</Icon>
        </div>
        <template v-else>
        <div class="panel-block">
          <p class="control has-icons-left">
            <input v-model="searchQuery" class="input" type="text" placeholder="Search">
            <Icon icon-class="is-left" icon="fa-search" />
          </p>
        </div>
        <a :class="['panel-block', {'is-active': selectedTutorial == tutorial}]" v-for="tutorial in filteredTutorials" :key="tutorial.title" @click="selectTutorial(tutorial)">
          <span class="panel-icon">
            <FontAwesomeIcon v-if="tutorial.type === 'video'" icon="fa-video" />
            <FontAwesomeIcon v-else-if="tutorial.type === 'text'" icon="fa-font" />
          </span>
          {{ tutorial.title }}
        </a>
        <div class="panel-block has-text-grey">
          {{ filteredTutorials.length }} tutorials found
        </div>
        </template>
      </nav>
      <div class="box content" v-if="selectedTutorial?.description">
        <h4 class="title is-4">Tutorial Description</h4>
        <!-- eslint-disable-next-line vue/no-v-html -- pulled from local dev file -->
        <p v-html="selectedTutorial.description"></p>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeMount, watchEffect, watch } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useRoute, useRouter } from 'vue-router';
import { request } from '@/js/util.js';
//@ts-expect-error missing types
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()

interface Tutorial {
  id: string,
  title: string,
  videoSrc: string,
  type: "video" | "text",
  description?: string,
  filename?: string
}
let tutorials = ref<Tutorial[]>()
let searchQuery = ref()
let htmlContent = ref()
let selectedTutorial = ref<Tutorial>()

const filteredTutorials = computed(() => {
  if(!tutorials.value) return []
  if(!searchQuery.value) return tutorials.value
  const query = searchQuery.value.toLowerCase()
  return tutorials.value.filter(tut => {
    return tut.title.toLowerCase().includes(query)
  })
})

async function selectTutorial(tutorial: Tutorial) {
  // Prevent double clicking making redudant requests
  if(tutorial == selectedTutorial.value) return
  selectedTutorial.value = tutorial
  htmlContent.value = undefined
  if(selectedTutorial.value.filename) {
    await fetchTutorialText(selectedTutorial.value.filename)
  }
  router.replace({params: { id: tutorial.id }})
}
onMounted(async() => {
  const response = await request(`/data/tutorials/tutorials.json?t=${BUILD_TIMESTAMP}`)
  if(response?.ok) {
    const tuts = await response.json()
    tutorials.value = tuts.map((tut: Tutorial) => {
      if(tut.description) tut.description = marked(tut.description)
      return tut
    })

    if(route.params.id) {
      const tutorial = tutorials.value!.find(tut => tut.id === route.params.id)
      if(tutorial) selectTutorial(tutorial)
      else console.warn(`No tutorial found with id ${route.params.id}`)
    }
  }
})

// TODO: use router-link instead?
watch(() => route.params.id, (id) => {
  if(!tutorials.value) return
  const tutorial = tutorials.value.find(tut => tut.id === id)
  if(tutorial) selectTutorial(tutorial)
  else console.warn(`No tutorial found with id ${id}`)
})

async function fetchTutorialText(filename: string) {
  const response = await fetch(`/data/tutorials/${filename}?t=${BUILD_TIMESTAMP}`)
  if(response?.ok) {
    htmlContent.value = marked(await response.text())
  } else if(response && response.status == 404) {
    htmlContent.value = "<span class='has-text-danger'>Tutorial file is missing</span>"
  } else {
    htmlContent.value = `<span class='has-text-danger'>An error occurred</span>`
  }
}
</script>

<style>
html[data-theme="light"] {
  .panel-block.is-active {
    color: black;
    font-weight: bold;
  }
}
html[data-theme="dark"] {
  .panel-block.is-active {
    font-weight: bold;
  }
}

</style>

<template>
  <nav class="pagination" role="navigation" aria-label="pagination">
    <a v-if="prevPage" class="pagination-previous" @click="setPage(prevPage)">Previous</a>
    <a v-if="nextPage" class="pagination-next" @click="setPage(nextPage)">Next page</a>
    <ul class="pagination-list">
      <template v-if="prevPage">
        <li>
          <a class="pagination-link" aria-label="Goto page 1" @click="setPage(1)">1</a>
        </li>
        <li>
          <span class="pagination-ellipsis">&hellip;</span>
        </li>
      </template>
      <li v-if="prevPage">
        <a class="pagination-link" @click="setPage(prevPage)">{{prevPage}}</a>
      </li>
      <li>
        <a class="pagination-link is-current" aria-current="page" @click="setPage(page)">{{page}}</a>
      </li>
      <li v-if="nextPage">
        <a class="pagination-link" @click="setPage(nextPage)">{{nextPage}}</a>
      </li>
      <template v-if="nextPage">
      <li>
        <span class="pagination-ellipsis">&hellip;</span>
      </li>
      <li>
        <a class="pagination-link" @click="setPage(maxPages)">{{maxPages.toLocaleString()}}</a>
      </li>
      </template>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['page'])

const props = defineProps<{
  page: number,
  count: number,
  limit: number
}>()


const prevPage = computed(() => {
  const page = props.page - 1
  return (page == 0) ? null : page
})
const nextPage = computed(() => {
  const page = props.page + 1
  return (page > maxPages.value) ? null : page
})
const maxPages = computed(() => {
  return Math.ceil(props.count / props.limit)
})

function setPage(page: number | null) {
  if(page) emit('page', page)
}

</script>

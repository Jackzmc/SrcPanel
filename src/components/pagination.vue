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
        <a class="pagination-link" @click="setPage(maxPages)">{{maxPages}}</a>
      </li>
      </template>
    </ul>
  </nav>
</template>

<script>
export default {
  props: {
    page: Number,
    count: Number,
    limit: Number
  },
  computed: {
    prevPage() {
      const page = this.page - 1
      return (page == 0) ? null : page
    },
    nextPage() {
      const page = this.page + 1
      return (page > this.maxPages) ? null : page
    },
    maxPages() {
      return Math.ceil(this.count / this.limit)
    }
  },
  methods: {
    setPage(page) {
      this.$emit('page', page)
    },
  }
}
</script>

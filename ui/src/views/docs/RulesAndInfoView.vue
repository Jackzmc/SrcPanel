<template>
<div class="container">
  <div class="columns is-multiline">
    <div class="column" v-if="!items">
      <div class="content has-text-centered my-6">
        <h4>
          <Icon icon="fa-spinner" spin>Loading Rules & Procedures</Icon>
        </h4>
      </div>
    </div>
    <div class="column" v-else-if="itemsFiltered.length === 0">
      <div class="my-6 content has-text-centered">
        <p class="is-size-5" v-if="query">No items found matching query</p>
        <p class="is-size-5" v-else>No items found</p>
      </div>
    </div>
    <div class="column" v-else>
      <div v-for="item in itemsFiltered" :key="item.slug" :id="item.slug" class="box content">
        <h4>{{ item.title }}</h4>
        <span v-html="item.content" />
      </div>
    </div>
    <div class="column is-4">
      <div class="box">
        <Field icon-left="search">
          <input type="text" class="input" placeholder="Search for an item" v-model="query" />
        </Field>
        <aside class="menu">
          <p class="menu-label">Procedures</p>
          <ul class="menu-list">
            <li v-for="item in procedures" :key="item.slug"><a :href="'#'+item.slug">{{ item.title }}</a></li>
          </ul>
          <p class="menu-label">Rules</p>
          <ul class="menu-list">
            <li v-for="item in rules" :key="item.slug"><a :href="'#'+item.slug">{{ item.title }}</a></li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue';
import { request } from '@/js/util.js';
import { computed, onMounted, ref } from 'vue';

const items = ref<Record<string, any>[]>()

const query = ref<string>()

const itemsFiltered = computed(() => {
  if(!items.value) return []
  if(!query.value) return items.value
  const q = query.value.toLocaleLowerCase()
  return items.value.filter(item => item.slug.includes(q) || item.title.toLocaleLowerCase().includes(q))
})

const procedures = computed(() => {
  return itemsFiltered.value?.filter(item => item.type === "procedure") ?? []
})

const rules = computed(() => {
  return itemsFiltered.value?.filter(item => item.type === "rule") ?? []
})

async function fetchContent() {
  const response = await request("/api/cms/rules_procedures?filter[status][_eq]=published")
  if(response?.ok) {
    const json = await response.json()
    items.value = json
  }
}

onMounted(() => {
  fetchContent()
})
</script>
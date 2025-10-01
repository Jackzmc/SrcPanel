<template>
<div class="card">
  <header class="card-header px-2 py-4" style="border-bottom: 1px solid; align-items: inherit; display: block">
    {{ parentFolder }}
    <span class="has-text-weight-normal">{{ cfg.selected.filename }}</span>
    <span class="has-text-weight-light is-pulled-right">f8eb84f7421c4</span>
  </header>
  <div v-if="cfg.selected" class="card-content">
    <template v-if="cfg.json">
      <Field label="Cvars">
        <div v-for="entry in cfg.json" :key="entry.command" class="columns ">
          <div class="column is-5">
            <input class="input is-expanded" type="text" :value="entry.cvar ?? entry.command" />
          </div>
          <div class="column is-6">
            <input v-if="entry.type === 'string'" class="input" type="text" :value="entry.value" />
            <input v-else-if="entry.type === 'number'" class="input" type="number" :value="entry.value" />
            <em v-else-if="entry.type === 'hidden'">(hidden)</em>
          </div>
          <div class="column is-1">
            <span v-if="entry.type === 'string'" class="tag is-primary is-large" data-tooltip="String">S</span>
            <span v-if="entry.type === 'number'" class="tag is-info is-large" data-tooltip="Number">N</span>
          </div>
        </div>
        <!-- <span class="has-text-dark">{{entry.cvar ?? entry.command}}</span>
                        <span :class="{'config-string': entry.type === 'string', 'has-text-info': entry.type === 'number'}">
                          {{entry.value}}
                        </span> -->
      </Field>
      <Field label="Add New Cvar">
        <div class="columns">
          <div class="column">
            <input class="input" type="text" />
          </div>
          <div class="column">
            <input class="input" type="text" />
          </div>
        </div>
      </Field>
      <Field label="Add New Command">
        <div class="columns">
          <div class="column">
            <input class="input" type="text" />
          </div>
          <div class="column">
            <input class="input" type="text" />
          </div>
        </div>
      </Field>
    </template>
    <pre v-if="cfg.raw" class="box">
    {{ cfg.raw }}
    </pre>
  </div>
</div>
</template>

<script setup lang="ts">
const props = defineProps<{
  cfg: any,
  parentFolder?: string
}>()
</script>

<template>
  <ModalCard :title="(data ? 'Edit' : 'Add') + ' Server Group'" @close="cancel">
    <form>
      <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
        <Tab name="General">
          <div class="columns">
            <div class="column is-6">
              <Field label="Id*">
                <template v-slot:hint_error v-if="!group.id">
                  <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
                </template>
                <input required :class="['input',{'is-danger': !group.id }]" type="text" placeholder="A unique identifier" v-model="group.id" />
              </Field>
            </div>
            <div class="column is-6">
              <Field label="Name">
                <input required class="input" type="text" placeholder="An optional friendly name" v-model="group.name" @change="onEnterName" />
              </Field>
            </div>
          </div>
          <Field label="Type*">
            <div :class="['select']">
              <select required v-model="group.type">
                <option value="left4dead2">Left 4 Dead 2</option>
                <option value="source">Generic Source Engine</option>
                <option value="minecraft">Minecraft</option>
              </select>
            </div>
          </Field>
        </Tab>
        <Tab name="Actions">

        </Tab>
      </Tabs>
    </form>
    <template v-slot:buttons>
      <button class="button is-success has-text-white" :disabled="!canSubmit" v-if="hasEdited" @click="save">{{ data ? 'Save Changes' : 'Add Group' }}</button>
      <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
    </template>
  </ModalCard>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import ModalCard from '@/components/ModalCard.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { GroupInfo, ServerInfo } from '../../../../../common-types/Server.js';
import { ConfigServerData } from '../../../../../server/src/modules/servers/Server';
// @ts-expect-error
import BulmaTagsInput from '@creativebulma/bulma-tagsinput';
import { request } from '@/js/util.js';
import { LoadState } from '@/types/global.js';
import debounce from '@/js/debounce.js';
import { updatedDiff } from 'deep-object-diff';

const emit = defineEmits(["close", "save"])

const props = defineProps<{
  data?: GroupInfo | null
}>()

watch(() => props.data, () => {
  // deep copy:
  console.log("COPY")
  group.value = JSON.parse(JSON.stringify(props.data))
})

let group = ref<GroupInfo>({
  id: '',
  name: '',
  type: 'source',
  actions: []
})

const hasEdited = computed(() => {
  if(!group.value) return false
  if(!props.data) return true
  return Object.keys(updatedDiff(props.data, group.value)).length > 0
})

const validationErrors = computed(() => {
  const errors = []
  if(!group.value.id) errors.push("An unique identifier is required")
  if(!group.value.type) errors.push("An IP address is required")
  return errors
})

const canSubmit = computed(() => {
  return validationErrors.value.length === 0
})


function onEnterName() {
  if(!group.value.id) {
    group.value.id = group.value?.name?.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, '').replace(/[\s]/g, '-')
  }
}

async function save() {
  emit("save", group.value, props.data?.id)
  // TODO: SAVE LOGIC
}

function cancel() {
  if(hasEdited.value) {
    if(!confirm(`You have unchanged changes to ${group.value?.name || group.value.id || '(new group)'}, are you sure you want to cancel?`)) return
  }
  emit('close')
}

onMounted(async () => {
  if(props.data) {
    group.value = JSON.parse(JSON.stringify(props.data))
  }
  BulmaTagsInput.attach()
})
</script>

<style>
@import 'node_modules/@creativebulma/bulma-tagsinput/dist/css/bulma-tagsinput.min.css';
</style>

<template>
  <ModalCard :title="title" hide-footer @close="cancel">
  <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
    <Tab name="General">
      <Field label="Name">
        <input v-model="action.name" type="text" class="input" placeholder="My Action" />
      </Field>
      <div class="columns">
        <div class="column">
          <Field label="Namespace" info="This is the namespace of commands.">
            <div class="select">
              <select v-model="command.namespaceSelect" @change="onNamespaceSelect">
                <option value="default">Default</option>
                <option value="builtin">Built In</option>
                <option :value="null">Other</option>
              </select>
            </div>
          </Field>
        </div>
        <div class="column">
          <Field v-if="!command.namespaceSelect" label="Custom Namespace">
            <input v-model="command.namespace" type="text" class="input" placeholder="builtin" />
          </Field>
        </div>
      </div>
      <Field label="Command">
        <input v-model="command.command" type="text" class="input" placeholder="stop" />
      </Field>
      <template #buttons>
        <button v-if="hasEdited" class="button is-success has-text-white" :disabled="!canSubmit" @click="save">{{ data ? 'Save Changes' : 'Add Action' }}</button>
        <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
      </template>
    </Tab>
    <Tab name="Advanced">
      <Field label="Description" info="A brief description, used in tooltips">
        <input v-model="action.description" type="text" class="input" />
      </Field>
      <Field label="" info="Should this action be visible in server management views">
        <input
          id="isHidden"
          v-model="action.isHidden"
          type="checkbox"
          class="is-checkradio">
        <label for="isHidden">Show in UI?</label>
      </Field>
      <Field label="Color Hexcode" info="Leave blank to use default">
        <input v-model="action.color" type="text" class="input" placeholder="#FFF" />
      </Field>
    </Tab>
  </Tabs>
</ModalCard>
</template>

<script setup lang="ts">
import ModalCard from '@/components/ModalCard.vue';
import Field from '@/components/Field.vue'
import { computed, onMounted, ref, watch } from 'vue';
import { ServerAction } from '../../../../../common-types/Server.js';
import { updatedDiff } from 'deep-object-diff';
// @ts-expect-error no types
import { Tab, Tabs } from 'vue3-tabs-component'

const emit = defineEmits(["close", "save"])

const props = defineProps <{
  data?: ServerAction | null
}>()
let action = ref<ServerAction>( {
  name: "",
  description: "",
  command: "",
  isHidden: false,
  showWhen: "any"
})
let command = ref<{ namespace: string, command: string, namespaceSelect: string }>( {
  namespace: "default",
  namespaceSelect: "default",
  command: ""
} )
function updateCommand() {
  action.value.command = `${command.value.namespace}:${command.value.command}`
}
watch(() => command.value.namespace, updateCommand)
watch(() => command.value.command, updateCommand)


const title = computed(() => {
  return props.data ? `Edit Action` : "Add Action"
})


const hasEdited = computed(() => {
  if(!action.value) return false
  if(!props.data) return true
  return Object.keys(updatedDiff(props.data, action.value)).length > 0
})
const validationErrors = computed( () => {
  if(!action.value) return []
  const errors = []
  if(!action.value.name) errors.push("A name is required")
  if(!action.value?.command) errors.push("A command is required")
  return errors
})

const canSubmit = computed(() => {
  return validationErrors.value.length === 0
})

function onNamespaceSelect() {
  if (command.value.namespaceSelect ) {
    command.value.namespace = command.value.namespaceSelect
  }
}

function save() {
  emit('save', action.value, props.data?.name)
}

function cancel() {
  emit('close')
}

onMounted(() => {
  if(props.data) {
    action.value = JSON.parse(JSON.stringify(props.data))
    const [namespace, cmd] = action.value.command.split(":")
    command.value = {
      namespace,
      command: cmd,
      namespaceSelect: namespace
    }
  }
})
</script>

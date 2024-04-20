<template>
  <ModalCard :title="title" hide-footer @close="cancel">
    <Field label="Name">
      <input type="text" class="input" v-model="action.name" placeholder="My Action" />
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
        <Field label="Custom Namespace" v-if="!command.namespaceSelect">
          <input type="text" class="input" v-model="command.namespace" placeholder="builtin" />
        </Field>
      </div>
    </div>
    <Field label="Command">
      <input type="text" class="input" v-model="command.command" placeholder="stop" />
    </Field>
    <Field label="" info="Should this action be visible in server management views">
      <input
        id="isHidden"
        type="checkbox"
        class="is-checkradio"
        v-model="action.isHidden">
      <label for="isHidden">Show in UI?</label>
    </Field>
    <template #buttons>
      <button class="button is-success has-text-white" :disabled="!canSubmit" v-if="hasEdited">{{ data ? 'Save Changes' : 'Add Action' }}</button>
      <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
    </template>
  </ModalCard>
</template>

<script setup lang="ts">
import ModalCard from '@/components/ModalCard.vue';
import Field from '@/components/Field.vue'
import { computed, onMounted, ref, watch } from 'vue';
import { ServerAction } from '../../../../../common-types/Server.js';
import { updatedDiff } from 'deep-object-diff';

const emit = defineEmits(["close"])

const props = defineProps <{
  data?: ServerAction | null
}>()
let action = ref<ServerAction>( {
  name: "",
  description: "",
  command: "",
  isHidden: false
} )
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

function cancel() {

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

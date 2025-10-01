<template>
  <ModalCard :title="(data ? 'Edit' : 'Add') + ' Server Group'" @close="cancel">
    <form>
      <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
        <Tab name="General">
          <div class="columns">
            <div class="column is-6">
              <Field label="Id*">
                <template v-if="!group.id" #hint_error>
                  <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
                </template>
                <input v-model="group.id" required :class="['input',{'is-danger': !group.id }]" type="text" placeholder="A unique identifier" />
              </Field>
            </div>
            <div class="column is-6">
              <Field label="Name">
                <input v-model="group.name" required class="input" type="text" placeholder="An optional friendly name" @change="onEnterName" />
              </Field>
            </div>
          </div>
          <Field label="Type*">
            <div :class="['select']">
              <select v-model="group.game" required>
                <option value="left4dead2">Left 4 Dead 2</option>
                <option value="source">Generic Source Engine</option>
                <option value="minecraft">Minecraft</option>
              </select>
            </div>
          </Field>
        </Tab>
        <Tab name="Actions">
          <ActionModal v-if="actionEditActive" :data="selectedAction" @save="onActionSaved" @close="actionEditActive = false" />
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Command</th>
                <th></th>
              </tr>
            </thead>
            <VueDraggableNext v-model="group.actions" tag="tbody" handle=".handle">
              <tr v-for="action in group.actions" :key="action.name">
                <td class="valign" style="width:1%"><Icon class="handle" icon="fa-bars"></Icon></td>
                <td class="valign">{{ action.name }}</td>
                <td class="valign">{{ action.command }}</td>
                <td class="valign"><a class='button is-info is-outlined' @click="editAction(action)"><Icon icon="fa-edit"></Icon></a></td>
              </tr>
            </VueDraggableNext>
            <tfoot>
              <tr>
                <td colspan="4"><button class="is-info is-outlined button" @click="editAction(null)"><Icon icon="fa-plus">New Action</Icon></button></td>
              </tr>
            </tfoot>
          </table>
        </Tab>
      </Tabs>
    </form>
    <template #footer>
      <nav class="level">
        <div class="level-left">
          <div class="level-item">
            <button v-if="hasEdited" class="button is-success has-text-white" :disabled="!canSubmit" @click="save">{{ data ? 'Save Changes' : 'Add Group' }}</button>
          </div>
          <div class="level-item">
            <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button v-if="props.data" class="button is-danger has-text-white" @click="emit('delete', props.data)"><Icon icon="fa-trash">Delete</Icon></button>
          </div>
        </div>
      </nav>

    </template>
  </ModalCard>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
// @ts-expect-error no types
import { Tab, Tabs } from 'vue3-tabs-component'
import ModalCard from '@/components/ModalCard.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { GroupInfo, ServerAction, ServerInfo } from '../../../../../common-types/Server.js';
// @ts-expect-error no types
import BulmaTagsInput from '@creativebulma/bulma-tagsinput';
import { request } from '@/js/util.js';
import { updatedDiff } from 'deep-object-diff';
import { VueDraggableNext } from 'vue-draggable-next';
import ActionModal from './ActionModal.vue'

const emit = defineEmits(["close", "save", 'delete'])

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
  actions: [{
    name: 'Restart',
    command: 'builtin:stop',
    description: 'Restart the server',
    isHidden: false,
  }, {
    name: 'Request Restart',
    command: 'builtin:request_stop',
    description: 'Restart the server if no players online',
    isHidden: false,
  }]
} )
let selectedAction = ref<ServerAction | null>()
let actionEditActive = ref(false)

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

function editAction( action: ServerAction | null ) {
  actionEditActive.value = true
  selectedAction.value = action
}

function onActionSaved( action: ServerAction, oldId?: string) {
  if(!group.value.actions) group.value.actions = []
  if(!oldId) {
    group.value.actions.push(action)
  } else {
    group.value.actions = group.value.actions.map((a: ServerAction) => a.name === oldId ? action : a)
  }
  selectedAction.value = null
  actionEditActive.value = false
}

function onEnterName() {
  if(!group.value.id) {
    group.value.id = group.value?.name?.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, '').replace(/[\s]/g, '-')
  }
}

function autoTrim( text: string, limit: number ) {
  if (text.length > limit ) {
    return text.substring(0, limit) + '...'
  } else {
    return text
  }
}

async function save() {
  const response = await request('/api/panel/groups', {
    method: "PUT",
    body: JSON.stringify(group.value),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  if(response?.ok) {
    emit("save", group.value, props.data?.id)
  }
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

<style scoped src="node_modules/@creativebulma/bulma-tagsinput/dist/css/bulma-tagsinput.min.css" />


<style scoped>
td.valign {
  vertical-align: middle;
}
</style>

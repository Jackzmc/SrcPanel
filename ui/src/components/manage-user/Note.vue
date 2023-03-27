<template>
<div class="notification" >
    <h6 class="title is-6" v-if="edit">
      <label class="label">Marked By:</label>
      <input type="text" class="input" style="width:50%" v-model="edit.markedBy" />
      <div class="is-pulled-right is-inline">
        <a class="button is-small is-outlined is-danger mr-2"><Icon button icon="fa-trash" data-tooltip="Delete this note" @click="deleteNote" /></a>
        <span data-tooltip="Note ID">
          #{{ note.id }}
        </span>
      </div>
    </h6>
    <h6 class="title is-6" v-else>
      {{note.markedBy.name}}:
      &nbsp;<em class="has-text-weight-normal">
        ({{note.markedBy.id}})
      </em>
      <div class="is-pulled-right is-inline">
        <a @click="startEdit"><Icon icon="fa-edit"></Icon></a>
        <span data-tooltip="Note ID">
          #{{ note.id }}
        </span>
      </div>
      </h6>
    <div class="content">
        <template v-if="edit">
          <label class="label">Content:</label>
          <input type="text" class="input" v-model="edit.content" />
        </template>
        <template v-else>
            <ActionNote v-if="note.action" :action="note.action" secondary-color="is-white"  />
            <span v-else>{{ note.content }}</span>
        </template>
    </div>
    <div class="buttons" v-if="edit">
        <a class="button is-success is-small" @click="saveNote"><Icon button icon-class="is-small" icon="fa-check">Save</Icon></a>
        <a class="button is-small is-outlined" @click="edit = undefined"><Icon button icon="times">Cancel</Icon></a>
    </div>
</div>
</template>

<script setup lang="ts">
import { notify } from '@kyvg/vue3-notification';
import { ref, computed } from 'vue';
import { Service, Action } from '../../../../common-types/Privileges';
import { Note } from '../../../../server/src/routes/!unprivileged/notes'
import { PrivilegedUser } from '../../js/User';
import ActionNote from '@/components/ActionNote.vue'
const emit = defineEmits(["deleted"])
const props = defineProps<{
  note: Note,
  privUser: PrivilegedUser
}>()

interface EditedNote {
  content: string,
  markedBy: string
}

const canEdit = computed(() => {
  return props.privUser.canPerformAction(Service.Notes, Action.Edit, props.note.markedBy.id)
})

let edit = ref<EditedNote>()
let loading = ref(false)

function startEdit() {
  edit.value = {
    content: props.note.content,
    markedBy: props.note.markedBy.id
  }
}

async function saveNote() {
  loading.value = true
  try {
      const response = await fetch(`/api/notes/${props.note.id}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(edit.value)
      })
      if(response.ok) {
          notify({
              type: "success",
              text: `Edited note #${props.note.id}`
          })
          edit.value = undefined
      } else {
          const json = await response.json()
          notify({
              type: "error",
              title: `Failed to edit note #${props.note.id}`,
              text: json.message
          })
      }
  } catch(err: any) {
      notify({
          type: "error",
          title: `Failed to edit note #${props.note.id}`,
          text: err.message
      })
  } finally {
    loading.value = false
  }
}
async function deleteNote() {
    if(window.confirm("Are you sure you want to delete this note?")) {
      loading.value = true
        try {
            const response = await fetch(`/api/notes/${props.note.id}`, { method: 'DELETE' })
            if(response.ok) {
                notify({
                    type: "success",
                    text: `Deleted note #${props.note.id}`
                })
                emit("deleted")
            } else {
                const json = await response.json()
                notify({
                    type: "error",
                    title: `Failed to delete note #${props.note.id}`,
                    text: json.message
                })
            }
        } catch(err: any) {
            notify({
                type: "error",
                title: `Failed to delete note #${props.note.id}`,
                text: err.message
            })
        } finally {
          loading.value = false
        }
    }
}
</script>

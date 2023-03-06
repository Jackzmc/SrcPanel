<template>
<div class="notification" >
    <h6 class="title is-6" v-if="edit">
      <label class="label">Marked By:</label>
      <input type="text" class="input" style="width:50%" v-model="edit.markedBy" />
      <span class="is-pulled-right is-inline" data-tooltip="Note ID">#{{ note.id }}</span>
    </h6>
    <h6 class="title is-6" v-else>{{note.markedBy.name}}: <em class="has-text-weight-normal">({{note.markedBy.id}})</em> <span class="is-pulled-right is-inline" data-tooltip="Note ID">#{{ note.id }}</span></h6>
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
        <a class="button is-success is-small" @click="saveNote">Save</a>
        <a class="button is-small is-outlined" @click="edit = undefined">Cancel</a>
        <a class="button is-danger is-small is-outlined" @click="deleteNote">Delete</a>
    </div>
    <div class="buttons" v-else>
        <a class="button is-small is-outlined" @click="startEdit">Edit</a>
    </div>
</div>
</template>

<script setup lang="ts">
import { notify } from '@kyvg/vue3-notification';
import { ref } from 'vue';
import { Note } from '../../../../server/src/routes/!unprivileged/notes'
const emit = defineEmits(["deleted"])
const props = defineProps<{
    note: Note
}>()

interface EditedNote {
  content: string,
  markedBy: string
}

let edit = ref<EditedNote>()

function startEdit() {
  edit.value = {
    content: props.note.content,
    markedBy: props.note.markedBy.id
  }
}

async function saveNote() {
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
    }
}
async function deleteNote() {
    if(window.confirm("Are you sure you want to delete this note?")) {
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
        }
    }
}
</script>

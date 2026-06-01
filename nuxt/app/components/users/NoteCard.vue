<template>
    <UCard :ui="{body:'p-3!'}">
        <div class="flex flex-row justify-between">
            <div class="flex flex-col gap-2">
                <div class="flex flex-row items-start gap-2">
                    <UBadge>#{{ note.id  }}</UBadge>
                    <UTooltip text="Note created on">
                        <UBadge variant="outline" color="neutral">
                            <IconText leading-icon="lucide:clock">{{ formatDateSmart(note.createdAt) }}</IconText>
                        </UBadge>
                    </UTooltip>
                </div>
                <UserComponent :user="note.markedBy" class='font-bold text-primary' />
                <p class="text-muted">"{{ note.content }}"</p>
            </div>
            <div class="flex flex-col items-end justify-between gap-2">
                <div class="flex flex-row gap-2">
                    <UTooltip text="Edit note">
                        <UButton leading-icon="lucide:edit" variant="outline" color="neutral" 
                            :loading="noteEditing"
                            @click="editNote" 
                        />
                    </UTooltip>
                    <UTooltip text="Delete note">
                        <UButton leading-icon="lucide:trash" variant="outline" color="error" 
                            :loading="noteDeleting"
                            @click="deleteNote" 
                        />
                    </UTooltip>
                </div>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { formatDate, formatDateSmart } from '@jzpanel/common/format';
import type { Note } from '@jzpanel/common/Note';

const emit = defineEmits(["refresh"])
const { promptConfirm, promptInput } = useModal()
const toast = useToast()

const props = defineProps<{
    note: Note
}>()

const noteDeleting = ref(false)
const noteEditing = ref(false)


async function deleteNote() {
    noteDeleting.value = true
    if(await promptConfirm({
        title: "Confirm deletion",
        description: `Note #${props.note.id} by ${ props.note.markedBy.name ?? props.note.markedBy.id } will be deleted.`,
        okText: 'Delete',
        okColor: 'error'
    })) {
        const result = await request(`/api/notes/${props.note.id}`, {
            method: "DELETE"
        })
        if('body' in result) {
            toast.add({
                title: `Deleted note #${props.note.id}`,
                color: 'success',
                icon: 'lucide:note'
            })
            emit("refresh")
        } else {
            toast.add({
                title: 'Deleting note failed',
                description: result.error.message,
                color: 'error',
                icon: 'lucide:note'
            })
        }
    }
    noteDeleting.value = false
}

async function editNote() {
    noteEditing.value = true
    const newContent = await promptInput({
        title: 'Edit note',
        defaultValue: props.note.content,
        maxlength: 255,
        minlength: 3,
        placeholder: "Note message here"
    })
    if(!newContent) {
        noteEditing.value = false
        return
    }

    const result = await request(`/api/notes/${props.note.id}`, {
        method: "PUT",
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            content: newContent,
            // legacy - just keep it same
            markedBy: props.note.markedBy.id
        })
    })
    if('body' in result) {
        toast.add({
            title: `Edited note #${props.note.id}`,
            color: 'success',
            icon: 'lucide:note'
        })
        emit("refresh")
    } else {
        toast.add({
            title: 'Editing note failed',
            description: result.error.message,
            color: 'error',
            icon: 'lucide:note'
        })
    }
    noteEditing.value = false
}
</script>
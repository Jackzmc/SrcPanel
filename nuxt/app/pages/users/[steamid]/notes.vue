<template>
  <div class="mt-4">
    <p class="py-2">Showing {{  data?.notes.length }} notes</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UAlert v-if="error" color="error" title="Error" :description="error.message" />
      <UCard :ui="{body:'p-3!'}" class="border border-dashed">
          <div class="flex flex-row justify-between items-end gap-2">
              <div class="flex flex-col gap-2 grow">
                  <div class="flex flex-row items-start gap-2">
                      <UBadge>New Note</UBadge>
                  </div>
                  <UserComponent :user="user!.user" class='font-bold text-primary' hide-tooltip />
                  <UTextarea v-model="newNoteContent"
                    placeholder="Enter note content" 
                    icon="lucide:quote" 
                    :maxlen="255" 
                    autofocus 
                    autoresize
                    :rows="1"
                    :loading="newNoteSubmitting"
                    @keydown.enter="createNote()"
                  />
              </div>
              <UButton :disabled="!canSubmit" :loading="newNoteSubmitting" @click="createNote()">
                Create
              </UButton>
          </div>
      </UCard>
      <NoteCard v-for="note in data?.notes" :key="note.id" 
        :note="note" 
        @refresh="refresh()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  tab: "notes",
})

import { type APICreateNoteResponse, type APIListUserNotes, type APINotesResponse } from '@jzpanel/common/Note';
import type { APIUserDetails } from '@jzpanel/common/User'
import NoteCard from '~/components/users/NoteCard.vue';

const api = useApi()
const toast = useToast()

const { user } = useAuth()

const props = defineProps<{
  steamid: string
  playerName: string,
  data: APIUserDetails
}>()

useSeoMeta({
  description: `Admin notes for ${props.playerName}`,
  ogDescription: `Admin notes for ${props.playerName}`
})

const { data, refresh, error } = await useAsyncData<APIListUserNotes>(
  `notes.${props.steamid}`,
  () => api(`/notes/user/${props.steamid}`)
)

const canSubmit = computed(() => {
  return newNoteContent.value.length > 3
})

const newNoteContent = ref("")
const newNoteSubmitting = ref(false)

async function createNote() {
  if(!canSubmit.value) return
  newNoteSubmitting.value = true

  const result = await request<APICreateNoteResponse>(`/api/notes/${props.steamid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: newNoteContent.value
    })
  })

  if('body' in result) {
    toast.add({
      title: `Note submitted for ${props.data.user.name ?? props.data.user.id}`,
      description: `Note #${result.body?.id}`,
      color: 'success',
      icon: "lucide:note"
    })
    newNoteContent.value = ""
    refresh()
  } else {
    toast.add({
      title: `Note submission failed`,
      description: result.error.message,
      color: 'error',
      icon: "lucide:note"
    })
  }
  newNoteSubmitting.value = false
}
</script>

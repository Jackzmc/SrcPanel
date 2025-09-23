<template>
<div class="content">
  <span v-for="(piece, i) in pieces" :key="i">
    <UserComponent :hide-avatar="hideAvatar" v-if="piece.user" :user="piece.user" />
    <span v-else-if="piece.html" v-html="piece.html"></span>
    <template v-else>{{ piece.text }}</template>
  </span>
</div>
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import { computed, ref, onBeforeMount, watch } from 'vue';
import { APIUser } from '../../../common-types/User';
//@ts-expect-error
import { marked } from 'marked';
marked.use({renderer:{
  image(src: string, title: string, alt: string) {
    return `<figure class="image is-256x256">
      <img class="md-image" src="${src}" alt="${alt ?? title}" />
    </figure>`
  }
}})

const props = defineProps<{
  text: string,
  markdown?: boolean,
  hideAvatar?: boolean
}>()

let pieces = ref<{ user?: APIUser, text?: string, html?: string }[]>([])

const STEAMID_REGEX = new RegExp(/STEAM_\d:\d:\d+/g)

const userNames: Record<string, string> = {}

function appendTextSlice(slice: string) {
  if(props.markdown) {
    pieces.value.push({
      // Verify hacky, slice off <p> and </p>\n
      html: marked(slice).slice(3, -5)
    })
  } else {
    pieces.value.push({
      text: slice
    })
  }
}

async function getPieces() {
    pieces.value = []

    const matches = props.text.matchAll(STEAMID_REGEX)
    const nameQueue = []
    let lastIndex = 0
    for(const match of matches) {
      // Append previous text
      appendTextSlice(props.text.slice(lastIndex, match.index))

      // Append the user
      nameQueue.push(match[0]) // Add to list of steamids to resolve
      pieces.value.push({
        user: {
          id: match[0],
          name: match[0], // Placeholder while we resolve
          avatarUrl: `/api/users/${match[0]}/avatar`
        }
      })

      lastIndex = match.index + match[0].length
    }

    appendTextSlice(props.text.slice(lastIndex))

    // Resolve all user's
    if(nameQueue.length > 0) {
      await Promise.allSettled(nameQueue.map(u => fetchUserName(u)))

      for(const piece of pieces.value) {
        if(piece.user) {
          console.log(userNames, piece.user.id)
          piece.user.name = userNames[piece.user.id]
        }
      }
    }
}

onBeforeMount(async () => {
  await getPieces()
})

watch(() => props.text, getPieces)

async function fetchUserName(steamid: string) {
  const response = await fetch(`/api/users/${steamid}`)
  if(response.ok) {
    const json = await response.json()
    userNames[steamid] = json.user.name
    return json.user.name
  }
}
</script>

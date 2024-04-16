<template>
<div class="content">
  <span v-for="(piece, i) in pieces" :key="i">
    <UserComponent class="mr-1" hide-avatar v-if="piece.user" :user="piece.user" />
    <span class="mr-1" v-else-if="piece.html" v-html="piece.html"></span>
    <template v-else>{{ piece.text }}</template>
  </span>
</div>
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import { computed, ref, onBeforeMount } from 'vue';
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
  markdown?: boolean
}>()

let pieces = ref<{ user?: APIUser, text?: string, html?: string }[]>([])

const STEAMID_REGEX = new RegExp(/STEAM_\d:\d:\d+/g)

const userNames: Record<string, string> = {}

async function getPieces() {
    const split = props.text.split(" ")
    pieces.value = []
    for(const elem of split) {
      if(STEAMID_REGEX.test(elem)) {
        await fetchUser(elem)
        pieces.value.push({
          user: {
            id: elem,
            name: userNames[elem],
            avatarUrl: `/api/users/${elem}/avatar`
          }
        })
      } else if(props.markdown) {
        pieces.value.push({
          // Verify hacky, slice off <p> and </p>\n
          html: marked(elem).slice(3, -5)
        })
      } else {
        pieces.value.push({
          text: elem
        })
      }
    }
}

onBeforeMount(async () => {
  await getPieces()
})

async function fetchUser(steamid: string) {
  const response = await fetch(`/api/users/${steamid}`)
  if(response.ok) {
    const json = await response.json()
    userNames[steamid] = json.user.name
  }
}
</script>

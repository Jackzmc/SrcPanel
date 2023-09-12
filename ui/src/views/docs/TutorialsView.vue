<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <CollapsibleMessage ref="messageRefs"
        v-for="(video, i) in videos" :key="video.title" :title="video.title" color="is-dark" body-class=""
        @toggle="(val: boolean) => onToggleVideo(i, val)"
      >
        <video :ref="r => addVideoRef(r, i)" :src="video.videoSrc" controls />
      </CollapsibleMessage>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { notify } from '@kyvg/vue3-notification';
import CollapsibleMessage from '@/components/CollapsibleMessage.vue'

const VIDEOS = [
  {
    title: "5 Player Tutorial Video",
    videoSrc: "https://cdn.jackz.me/videos/tutorial-8player.mp4"
  },
  {
    title: "Addon Installing Video",
    videoSrc: "https://i.jackz.me/2023/09/DimwittedVuByh.mp4"
  }
]
let videos = ref<{title: string, videoSrc: string, isOpen: boolean, videoRef?: any}[]>(VIDEOS.map(v => {
  return { ...v, isOpen: false }
}));
let messageRefs = ref()

function onToggleVideo(index: number, val: boolean) {
  if(val)
    videos.value[index].videoRef.play()
  else
    videos.value[index].videoRef.pause()
}
function addVideoRef(ref: any, index: number) {
  videos.value[index].videoRef = ref
}
</script>

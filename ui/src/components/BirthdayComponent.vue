<template>
  <div class="modal is-active"  @click="close">
    <div class="modal-background"></div>
    <div class="modal-content box has-text-centered">
      <h1 class="title is-1">HAPPY BIRTHDAY</h1>
      <p class="subtitle">Click anywhere to close</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
//@ts-expect-error
import confetti from "canvas-confetti"
const emit = defineEmits(["close"])

async function playConfetti(duration: number, defaults: any = {}) {
  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
  const animationEnd = Date.now() + duration;
  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if(timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.3, 0.7), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

function close() {
  emit('close')
}

onMounted(async () => {
  await playConfetti(3000)
})
</script>

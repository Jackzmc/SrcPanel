<template>
<div class="container">
  <div class="block">
    <!-- <nav class="breadcrumb is-centered" aria-label="breadcrumbs">
      <ul>
        <li v-for="(step, i) in STEPS" :key="i" :class="{'is-active': currentStep === i }">
          <a :class="{'has-text-black': currentStep < i}" href="#">
            <Icon :icon="step.icon">{{ step.title }}</Icon>
          </a>
        </li>
      </ul>
    </nav> -->
    <div class="columns">
      <div class="column is-8" v-if="currentStep === 0">
          <div class="tabs is-toggle is-fullwidth is-large">
          <ul>
            <li v-for="(step, i) in STEPS" :key="i" :class="{'is-active': currentStep >= i }" >
              <a @click="currentStep = i" :style="{'opacity': (i > highestStep) ? 0.5: undefined, cursor: i > highestStep ? 'not-allowed' : undefined }">
                <Icon :icon="step.icon"></Icon>
                <span>{{ step.title }}</span>
              </a>
            </li>
          </ul>
        </div>
        <div class="box">
          <h4 class="title is-4">Server Settings</h4>
          <Field label="Name">
            <span class="help">Give your server a name</span>
            <br>
            <input class="input" type="text" v-model="form.name" :placeholder="props.privUser.name + '\'s server'" />
          </Field>
          <br>
          <Field label="Game">
            <span class="help">Select the type of game this server is for</span>
            <br>
            <div class="tabs is-toggle is-medium">
              <ul>
                <li v-for="(display, id) in GAMES" :key="id" :class="{'is-active': form.game === id }">
                  <a @click="form.game = id">
                    <span>{{ display }}</span>
                  </a>
                </li>
              </ul>
            </div>
          </Field>
        </div>
        <br>
        <button class="button" @click="advStep(-1)" v-if="currentStep > 0">
          <Icon icon="fa-chevron-left">Back</Icon>
        </button>
        <button :class="['button','is-pulled-right',{'is-info': canAdvance}]" @click="advStep(1)" v-if="currentStep < STEPS.length - 1" :disabled="!canAdvance">
          <Icon icon="fa-chevron-right"  text-left="Next"></Icon>
        </button>
      </div>
      <div class="column">
        <div class="box has-background-lighter" style="border-radius: 1px">
          <h4 class="title is-4 has-text-centered">Overview</h4>
          <ul>
            <li><b>Name: </b>{{ form.name }}</li>
            <li><b>Game: </b>{{ form.game ? GAMES[form.game] : '' }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue';
import { PrivilegedUser } from '@/js/User.js';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

const GAMES = { l4d2: "Left 4 Dead 2" }

interface Step {
  title: string,
  icon: string,
  validator?: () => boolean
}

const STEPS: Step[] = [
  { title: "Settings", icon: "fa-gear", validator: () => form.value.name != "" && form.value.game != "" },
  { title: "Plugins", icon: "fa-puzzle-piece" },
  { title: "Addons", icon: "fa-square-plus" },
  { title: "Review", icon: "fa-circle-info"},
]

interface CustomServer {
  name: string,
  game: string
}

let currentStep = ref<number>(0)
let highestStep = ref<number>(0)
let form = ref<CustomServer>({
  name: "",
  game: ""
})

const canAdvance = computed(() => {
  const step = STEPS[currentStep.value]
  if('validator' in step) return step.validator!()
  return true
})

function advStep(dir: number) {
  if(dir > 0 && canAdvance.value) return
  let step = currentStep.value + dir
  step = Math.max(Math.min(step, STEPS.length - 1), 0)
  currentStep.value = step
  highestStep.value = Math.max(highestStep.value, step)
}

</script>

<template>
<div class="container is-fluid mx-4">
  <div class="block">
    <div class="columns">
      <div class="column is-8" >
          <div class="tabs is-toggle is-fullwidth is-large">
          <ul>
            <li v-for="(step, i) in STEPS" :key="i" :class="{'is-active': currentStep >= i }" >
              <a @click="setStep(i)" :style="{'opacity': (i > highestStep) ? 0.5: undefined, cursor: i > highestStep ? 'not-allowed' : undefined }">
                <Icon :icon="step.icon"></Icon>
                <span>{{ step.title }}</span>
              </a>
            </li>
          </ul>
        </div>
        <div class="box" v-if="currentStep === 0">
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
        <div class="box" v-else-if="currentStep === 1">
          <h4 class="title is-4">Server Plugins</h4>
          <p class="subtitle is-6">Subtitle</p>
          <div class="columns">
            <div class="column is-4">
              <div class="card has-background-grey-lighter my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Admin Panel</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
              <div class="card has-background-grey-lighter my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Global Bans</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
            </div>
            <div class="column is-4">

            </div>
            <div class="column is-4">
              <div class="card has-background-success-light my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Admin Panel</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
              <div class="card has-background-success-light my-2 py-0 px-0">
                <div class="card-content px-4 py-2">
                  <h5 class="title is-5">Global Bans</h5>
                  <p class="subtitle is-6">
                    v1.0.0 - Created by jackz
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="box" v-else>
          error.
          step = {{currentStep}}
        </div>
        <br>
        <button class="button" @click="setStep(currentStep - 1)" v-if="currentStep > 0">
          <Icon icon="fa-chevron-left">Back</Icon>
        </button>
        <button :class="['button','is-pulled-right',{'is-info': canAdvance}]" @click="setStep(currentStep + 1)" v-if="currentStep < STEPS.length - 1" :disabled="!canAdvance">
          <Icon icon="fa-chevron-right"  text-left="Next"></Icon>
        </button>
      </div>
      <div class="column is-3">
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

const GAMES: Record<string, string> = { l4d2: "Left 4 Dead 2" }

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
  game: string,
  enabledPlugins: string[],
  enabledAddons: string[]
}

let currentStep = ref<number>(1)
let highestStep = ref<number>(0)
let form = ref<CustomServer>({
  name: "",
  game: "",
  enabledPlugins: [],
  enabledAddons: []
})

const canAdvance = computed(() => {
  const step = STEPS[currentStep.value]
  if('validator' in step) return step.validator!()
  return true
})

function setStep(step: number) {
  if(step > currentStep.value && !canAdvance.value) return
  step = Math.max(Math.min(step, STEPS.length - 1), 0)
  currentStep.value = step
  highestStep.value = Math.max(highestStep.value, step)
}

</script>

<template>
<div v-if="model" class="box">
  <h4 class="title is-4">Server Settings</h4>
  <Field label="Name">
    <span class="help">Give your server a name</span>
    <br>
    <input v-model="model.name" class="input" type="text" :placeholder="props.privUser.name + '\'s server'" />
  </Field>
  <br>
  <Field label="Game">
    <span class="help">Select the type of game this server is for</span>
    <br>
    <div class="tabs is-toggle is-medium">
      <ul>
        <li v-for="(game) in meta.games" :key="game.appid"
          :class="{'is-active': model.game && model.game.appid === game.appid }">
          <a @click="model.game = game">
            <span>{{ game.title }}</span>
          </a>
        </li>
      </ul>
    </div>
  </Field>
  <br>
  <Field label="Other Settings">
    <label class="checkbox">
      <input v-model="model.extraPlayers" type="checkbox" />
      Enable 5+ Game support
    </label>
  </Field>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from '@/js/User.js';
import { CustomServerMetaInfo } from '../../../../../common-types/CustomServer.js';
import { ref } from 'vue';
import Field from '@/components/Field.vue';

const model = defineModel<{
  name: string,
  game: { appid: number, title: string},
  extraPlayers: boolean
}>({})

const props = defineProps<{
  privUser: PrivilegedUser,
  meta: CustomServerMetaInfo
}>()

</script>

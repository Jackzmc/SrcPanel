<template>
  <ModalCard title="Edit Destinations">
    <form>
      <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
        <Tab name="Destination 1">

        </Tab>
        <Tab name="Destination 2">

        </Tab>
        <Tab name="New Destination">
          <!-- id, name, serverids[], paths[] -->

        </Tab>
      </Tabs>
    </form>
    <template v-slot:buttons>
      <button class="button">Done</button>
    </template>
  </ModalCard>
  </template>

  <script setup lang="ts">
  import Field from '@/components/Field.vue'
  // @ts-ignore
  import { Tab, Tabs } from 'vue3-tabs-component'
  import ModalCard from '@/components/ModalCard.vue';
  </script>

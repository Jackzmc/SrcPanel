<template>
<ModalCard title="Add Share">
  <ShareDestinationModal />
  <form>
    <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
      <Tab name="General">
        <Field label="Name*" info="ID will be: my-share-name">
          <input required class="input" type="text" placeholder="My Share Name" />
        </Field>
        <Field label="Source Directory Path*" info="">
          <input required class="input" type="text" placeholder="/home/steam/content/addons" />
        </Field>
      </Tab>
      <Tab name="Download Sources">
        <!-- toggle-button | [appid field]-->
        <div class="columns">
          <div class="column is-6">
            <Field label="Steam Workshop">
              <a class="button is-outlined is-info">Enable</a>
            </Field>
          </div>
          <div class="column is-6">
            <Field label="App Id" info="The appid for steam workshop downloading">
              <input type="number" class="input" placeholder="550">
            </Field>
          </div>
        </div>
        <div class="columns">
          <div class="column is-6">
            <Field label="Direct Uploads">
              <a class="button is-outlined is-info">Enable</a>
            </Field>
          </div>
          <div class="column is-6">
            <Field label="Allowed File Extenstions" info="Comma,separated">
              <input class="input" type="text" placeholder=".vpk, .smx">
            </Field>
          </div>
        </div>
      </Tab>
      <!-- manually do tabs. -->
      <Tab name="Destinations">
        <p>Temporarily, click <a>here to open destination editor</a></p>
        <!-- id, name, serverids[], paths[] -->
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>Name</th>
              <th># Servers</th>
              <th># Paths</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <p><b>Destination 1</b></p>
                <em>dest-1</em>
              </td>
              <td>
                2
              </td>
              <td>2</td>
              <td>
                <div class="buttons">
                  <a class="button is-outlined is-info" data-tooltip="Edit destination"><Icon icon="fa-edit">Edit</Icon></a>
                  <a class="button is-outlined is-danger has-tooltip-danger" data-tooltip="Delete"><Icon icon="fa-trash"></Icon></a>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <p><b>Very Long Destination</b></p>
                <em>dest-2</em>
              </td>
              <td>
                <div class="tags">
                  2
                </div>
              </td>
              <td>2</td>
              <td>
                <div class="buttons">
                  <a class="button is-outlined is-info" data-tooltip="Edit destination"><Icon icon="fa-edit">Edit</Icon></a>
                  <a class="button is-outlined is-danger has-tooltip-danger" data-tooltip="Delete"><Icon icon="fa-trash"></Icon></a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Tab>
    </Tabs>
  </form>
  <template v-slot:buttons>
    <button class="button is-success has-text-white">Add Share</button>
    <button class="button">Cancel</button>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import ModalCard from '@/components/ModalCard.vue';
import ShareDestinationModal from '@/components/panel-admin/setup/ShareDestinationModal.vue'
</script>

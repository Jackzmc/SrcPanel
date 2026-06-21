<template>
  <UCard class="bg-gray-50 dark:bg-gray-950">
    <div>
      <div class="flex justify-between gap-3 items-start">
        <h2 class="text-lg font-semibold">
          <strong class="font-bold text-xl">Discuss: </strong>
          <EditText v-model="model.title" placeholder="Click to add a title" input-placeholder="Enter a title" />
        </h2>
      </div>
      <p class="text-sm">
        <EditText v-model="model.description" placeholder="Click to add a description" input-placeholder="Enter a description" />
      </p>

      <div class="grid grid-cols-2 gap-4 py-4">
        <!-- <UCard v-for="option in discuss.options" :key="option.id" class="bg-light-blue">
          <div class="flex justify-between">
            <h4 class="text-lg">{{ option.label }}</h4>
            <UTooltip text="Remove option">
              <UButton class="mt-2 cursor-pointer" size="sm" color="error" @click="emit('option:del', option.id)" leading-icon="lucide:trash" />
            </UTooltip>
          </div>

        </UCard> -->
        <div v-for="option in model.options" :key="option.id" class="bg-light-blue text-white items-center p-6 rounded-xl" @click="addOption">
          <div class="flex justify-between">
            <h4 class="text-lg light:text-black">
              {{ option.label }}
            </h4>
            <UTooltip text="Remove option">
              <UButton class="mt-2 cursor-pointer" size="sm" color="error" leading-icon="lucide:trash" @click="emit('option:del', option.id)" />
            </UTooltip>
          </div>
        </div>

        <div class="cursor-pointer bg-primary text-white flex items-center p-6 rounded-xl hover:bg-primary-400 dark:hover:bg-primary-600" @click="addOption">
          <h4 class="text-lg font-semibold">
            <IconText leading-icon="lucide:plus">
              Add Option
            </IconText>
          </h4>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { APIDiscussion, APIDiscussionBase } from "@jzpanel/common/Discussions";
import EditText from "./EditText.vue";

const model = defineModel<APIDiscussion | APIDiscussionBase>();

const { promptInput } = useModal();

const emit = defineEmits<{
  (e: "option:add", value: string): void;
  (e: "option:del", id: number): void;
}>();

const props = defineProps<{
  type: "list" | "details" | "edit";
}>();

async function addOption() {
  const value = await promptInput({
    title: "Enter Option Name",
  });
  if (value) {
    emit("option:add", value);
  }
}
</script>

<template>
  <DiscussSettingsEntry :label="label" :value="value">
    <UTabs
      :items="items"
      :content="false"
      class="w-full"
      size="sm"
      :default-value="defaultValue"
      @update:model-value="onTabSelected"
    />
  </DiscussSettingsEntry>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type { SettingEntry } from "~~/shared/types/discuss";
import DiscussSettingsEntry from "@/components/discuss/edit/DiscussSettingsEntry.vue";

const emit = defineEmits<{
  (e: "update:flags", flags: number): void;
}>();

const props = defineProps<{
  label: string;
  flags: number;
  items: SettingEntry[];
  value?: "inline" | "below";
}>();

const defaultValue = computed(() => {
  const index = props.items.findIndex(item => "set" in item && (props.flags & item.set));
  if (index > -1) return index;
  return props.items.findIndex(item => "unset" in item);
});

const items = computed(() => {
  return props.items.map<TabsItem>((item, index) => {
    return {
      ...item,
      value: index,
    };
  });
});

function onTabSelected(value: number | string) {
  const selectedItem = props.items[Number(value)];
  if (!selectedItem) throw new Error("Invalid tab index");

  if ("unset" in selectedItem) {
    if (Array.isArray(selectedItem.unset)) {
      emit("update:flags", props.flags & ~selectedItem.unset.reduce((a, b) => a | b, 0));
    }
    else {
      emit("update:flags", props.flags & ~selectedItem.unset);
    }
  }
  else if ("set" in selectedItem) {
    emit("update:flags", props.flags | selectedItem.set);
  }
}
</script>

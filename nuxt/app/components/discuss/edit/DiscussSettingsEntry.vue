<template>
  <div :class="['flex', 'mx-3', 'p-3', 'gap-4', 'border-b', 'border-t-gray-200', valueClass, 'items-center']">
    <UTooltip>
      <h3 class="text-md font-semibold">
        {{ label }}
      </h3>
    </UTooltip>
    <div class="">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string;
  value?: "inline" | "below";
}>(), {
  value: "inline",
});

const valueClass = computed(() => {
  if (props.value == "below") {
    return "flex-col";
  } else {
    return "justify-between";
  }
});
</script>

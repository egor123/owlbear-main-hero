<script setup lang="ts">
import type { LabelStyle } from "../scripts/types";
import { fonts } from "../scripts/types";
const props = defineProps<{
  labelStyle: LabelStyle;
}>();

const emit = defineEmits<{
  (e: "update", value: LabelStyle): void;
}>();

</script>

<template>
  <div class="label-settings">
    <span class="label-title">Label</span>

    <!-- Size -->
    <input
      type="number"
      min="8"
      max="48"
      :value="labelStyle.size"
      title="Label size"
      @input="
        emit('update', {
          ...labelStyle,
          size: +($event.target as HTMLInputElement).value,
        })
      "
    />

    <!-- Color -->
    <input
      type="color"
      :value="labelStyle.color"
      title="Label color"
      @change="
        emit('update', {
          ...labelStyle,
          color: ($event.target as HTMLInputElement).value,
        })
      "
    />

    <!-- Font -->
    <select
      :value="labelStyle.font"
      :style="{ fontFamily: fonts[labelStyle.font]?.css }"
      class="font-selector"
      @change="
        emit('update', {
          ...labelStyle,
          font: ($event.target as HTMLSelectElement)
            .value as LabelStyle['font'],
        })
      "
    >
      <option
        v-for="(data, key) in fonts"
        :key="key"
        :value="key"
        :style="{ fontFamily: data.css }"
      >
        {{ data.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.label-settings {
  display: flex;
  align-items: center;
  gap: 6px;

  margin-top: 6px;
  padding: 4px 6px;

  border-radius: 6px;
  border: 1px solid var(--primary-dark);
  background: var(--bg-paper);

  font-size: 11px;
}
.label-title {
  color: var(--text-disabled);
}

.font-selector{
  width: 80px;
  height: 22px;
}

</style>

<script setup lang="ts">
import type { LabelStyle } from "../scripts/types";

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
      title="Label font"
      @change="
        emit('update', {
          ...labelStyle,
          font: ($event.target as HTMLSelectElement)
            .value as LabelStyle['font'],
        })
      "
    >
      <option value="Roboto">Rounded</option>
      <option value="Gotica">Fantasy</option>
      <option value="Permanent Marker">Marker</option>
      <option value="Lemon Tuesday">Script</option>
      <option value="Dancing Script">Cursive</option>
      <option value="Courier Prime">Mono</option>
      <option value="EB Garamond">Serif</option>
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
  border: 1px solid #444;
  background: #1f1f1f;

  font-size: 11px;
}

.label-title {
  opacity: 0.7;
  margin-right: 4px;
}

.label-settings input[type="number"] {
  width: 44px;
  height: 22px;
  text-align: center;
}

.label-settings input[type="color"] {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: none;
}

.label-settings select {
  height: 22px;
  font-size: 11px;
  background: #2a2a2a;
  color: #ddd;
  border: 1px solid #555;
  border-radius: 4px;
}
</style>

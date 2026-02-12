<script setup lang="ts">
import { computed, ref } from "vue";
import type { OwlTracker } from "../scripts/types";
import { evaluate } from "mathjs";

const showColorPicker = ref<boolean>(false);

const props = defineProps<{
  tracker: OwlTracker;
}>();

const emit = defineEmits<{
  (e: "update", value: OwlTracker): void;
  (e: "move-up", value: string): void;
  (e: "move-down", value: string): void;
}>();

const palette = [
  "rgb(124 66 145)",
  "rgb(140 52 100)",
  "rgb(148 39 44)",
  "rgb(164 79 39)",
  "rgb(131 110 52)",
  "rgb(92 114 73)",
  "rgb(59 109 103)",
  "rgb(74 115 132)",
  "rgb(61 84 131)",
];

const color = computed(() => palette[props.tracker.color ?? 0] ?? palette[0]);

function updateValue(expr: string) {
  if (expr.trim() === "" || expr.trim() === "-") return;
  let value = props.tracker.value;
  if (/^[0-9+\-*/().\s]+$/.test(expr)) {
    try {
      value = Math.round(evaluate(expr));
    } catch {
      return;
    }
  }
  emit("update", {
    ...props.tracker,
    value,
  });
}
function updateMaxValue(expr: string) {
  if (expr.trim() === "" || expr.trim() === "-") return;
  let max = props.tracker.value;
  if (/^[0-9+\-*/().\s]+$/.test(expr)) {
    try {
      max = Math.round(evaluate(expr));
    } catch {
      return;
    }
  }
  emit("update", {
    ...props.tracker,
    max,
  });
}
function updateChecked(checked: boolean) {
  emit("update", {
    ...props.tracker,
    checked,
  });
}

function inc(delta: number) {
  const value = (props.tracker.value ?? 0) + delta;
  emit("update", {
    ...props.tracker,
    value,
  });
}

function setColor(index: number) {
  emit("update", {
    ...props.tracker,
    color: index,
  });
  showColorPicker.value = false;
}
</script>

<template>
  <div class="row" :style="{ '--accent': color }">
    <!-- Name -->
    <input
      class="name"
      type="text"
      v-model="tracker.name"
      placeholder="Tracker"
    />

    <!-- Checkbox -->
    <input
      v-if="tracker.variant === 'checkbox'"
      type="checkbox"
      :class="[
        'checkbox',
        'bi',
        (tracker.checked ?? true) ? 'bi-check-circle' : 'bi-circle',
      ]"
      :checked="tracker.checked ?? true"
      @change="updateChecked(($event.target as HTMLInputElement).checked)"
    />

    <!-- Value -->
    <input
      v-else-if="tracker.variant === 'value'"
      class="number"
      :value="tracker.value ?? 0"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />

    <!-- Counter -->
    <div v-else-if="tracker.variant === 'counter'" class="counter">
      <button @click="inc(-1)"><i class="bi bi-dash"></i></button>
      <input
        :value="tracker.value ?? 0"
        @input="updateValue(($event.target as HTMLInputElement).value)"
      />
      <button @click="inc(1)"><i class="bi bi-plus"></i></button>
    </div>

    <!-- Value / Max -->
    <div
      v-else-if="tracker.variant === 'value-max'"
      class="value-max"
      :style="{
        '--fill':
          Math.max(
            0,
            Math.min(
              100,
              tracker.max ? ((tracker.value ?? 0) / tracker.max) * 100 : 0,
            ),
          ) + '%',
      }"
    >
      <input
        :value="tracker.value ?? 0"
        @input="updateValue(($event.target as HTMLInputElement).value)"
      />
      /
      <input
        :value="tracker.max ?? 0"
        @input="updateMaxValue(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Move up -->
    <button
      class="icon-btn"
      title="Move up"
      @click="$emit('move-up', tracker.id)"
    >
      <i class="bi bi-arrow-up"></i>
    </button>

    <!-- Move down -->
    <button
      class="icon-btn"
      title="Move down"
      @click="$emit('move-down', tracker.id)"
    >
      <i class="bi bi-arrow-down"></i>
    </button>

    <!-- Show / Hide on map -->
    <button
      class="icon-btn"
      :title="(tracker.showOnMap ?? true) ? 'Hide on map' : 'Show on map'"
      @click="
        emit('update', {
          ...tracker,
          showOnMap: !(tracker.showOnMap ?? true),
        })
      "
    >
      <i
        :class="[
          'bi',
          (tracker.showOnMap ?? true) ? 'bi-eye-fill' : 'bi-eye-slash-fill',
        ]"
      ></i>
    </button>

    <!-- Color picker -->
    <div class="color-wrapper">
      <button
        class="icon-btn color-btn"
        title="Change color"
        @click="showColorPicker = !showColorPicker"
        :style="{ background: color }"
      >
        <i class="bi bi-palette-fill"></i>
      </button>
      <!-- v-if="showColorPicker"  -->
      <div class="color-popup">
        <button
          v-for="(c, i) in palette"
          :key="i"
          class="color-swatch"
          :style="{ background: c }"
          @click="setColor(i)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row {
  border: 1px solid var(--text-disabled);
  border-left: 4px solid var(--accent);
  padding: 0;
}
.name {
  margin-left: 1px;
  flex: 1;
  margin-right: auto;
  max-width: 30%;
  min-width: 0;
}

input:focus {
  outline: none;
}

.number {
  width: 40px;
  border-radius: 5px;
  background: var(--accent);
  border: none;
  text-align: center;
  color: var(--text-primary);
}

.counter {
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  border-radius: 5px;
  background: var(--accent);
  border: none;
  text-align: center;
}
.counter * {
  color: var(--text-primary);
  background: none;
  outline: none;
  border: none;
  text-align: center;
  padding: 0;
  margin: 0;
}
.counter input {
  max-width: 40px;
}

.counter button:hover {
  background: #0000001a;
}
.checkbox {
  appearance: none;
  -webkit-appearance: none;

  width: 1.75em;
  height: 1.25em;

  margin: 0;
  padding: 0;

  color: var(--text-secondary);
  background: var(--accent);
  border-radius: 5px;

  display: inline-grid;
  place-content: center;

  cursor: pointer;
}
.checkbox:hover {
  background: color-mix(in srgb, var(--accent) 85%, black);
  justify-items: center;
}

.value-max {
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  border-radius: 5px;
  background: linear-gradient(
    90deg,
    var(--accent) var(--fill),
    rgb(26, 26, 26) var(--fill)
  );
  border: none;
  text-align: center;
}
.value-max *:first-child {
  text-align: end;
}
.value-max * {
  color: var(--text-primary);
  width: 30px;
  background: none;
  outline: none;
  border: none;
}

.color-wrapper{
  position: relative;
}
.color-btn {
  width: 30px;
  padding: 0;
  margin: 0;
  border-radius: 5px;
}
.color-popup {
  display: none;

  position: absolute;

  left: 100%;
  transform: translateX(-100%);

  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 6px;
  background: var(--bg-default);
  border-radius: 6px;
  border: 1px solid var(--primary-dark);
  z-index: 10;
}
.color-wrapper:focus-within .color-popup {
  display: grid;
}

.color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
</style>

<script setup lang="ts">
import OBR, { type Grid } from "@owlbear-rodeo/sdk";
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  data: any;
}>();

const unsubscribe: any[] = [];

function onGridChange(grid: Grid) {
  dpi.value = grid.dpi;
}

onMounted(() => {
  OBR.onReady(async () => {
    unsubscribe.push(OBR.scene.grid.onChange(onGridChange));
  });
});

onUnmounted(() => {
  unsubscribe.forEach((f) => f?.());
});
const dpi = ref<number>(150); //TODO

const emit = defineEmits<{
  (e: "update", value: any): void;
}>();

function update(partial: Partial<any>) {
  if (!props.data) return;
  emit("update", { ...props.data, ...partial });
}

const type = computed<"NORMAL" | "FLASHLIGHT">(() => {
  if (!props.data || (!props.data.innerAngle && !props.data.outerAngle))
    return "NORMAL";
  return props.data.innerAngle === 360 && props.data.outerAngle === 360
    ? "NORMAL"
    : "FLASHLIGHT";
});

const range = computed<number>(() => {
  if (!props.data) return 0;
  return Math.round(props.data.attenuationRadius / dpi.value);
});

const smooth = computed<boolean>(() => {
  if (!props.data) return false;
  return props.data.falloff > 1;
});

function swapType() {
  if (type.value == "NORMAL") update({ innerAngle: 45, outerAngle: 60 });
  else update({ innerAngle: 360, outerAngle: 360 });
}

function setRange(value: number) {
  update({ attenuationRadius: Math.round(value * dpi.value) });
}

function toggleSmoothness() {
  if (smooth.value) update({ falloff: 0.2 });
  else update({ falloff: 1.5 });
}
</script>

<template>
  <div v-if="data" class="light-row">
    <button class="type-btn" @click="swapType">
      {{ type === "FLASHLIGHT" ? "🔦" : "💡" }}
    </button>

    <label class="range">
      Range
      <input
        type="number"
        pattern="[0-9]*"
        :value="range"
        min="0"
        @input="setRange(+($event.target as HTMLInputElement).value)"
      />
    </label>

    <button
      class="smooth-btn"
      :class="{ active: smooth }"
      title="Toggle smooth edge"
      @click="toggleSmoothness"
    >
      Smooth
    </button>
  </div>
</template>

<style scoped>
.light-row {
  display: flex;
  align-items: center;
  gap: 8px;

  font-size: 12px;
  font-weight: 600;

  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--text-disabled);
  /* background: #2a2a2a; */
}

.type-btn {
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;

  /* background: #3a3a3a;
  color: #bbb; */
}

.range {
  display: flex;
  align-items: center;
  gap: 4px;
}

.range input {
  width: 48px;
  text-align: center;
  border-radius: 4px;
  border: none;
  background: #444;
  color: var(--text-primary);
}

.range input:focus {
  outline: none;
  background: #555;
}

.smooth-btn {
  border: 1px solid;
  border-color: transparent;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;

  background: #3a3a3a;
  color: var(--text-primary);
}

.smooth-btn.active {
  border-color: var(--primary-light);
  color: var(--primary-light);
}
</style>

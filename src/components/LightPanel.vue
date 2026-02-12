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
  if (type.value == "NORMAL") update({ innerAngle: 70, outerAngle: 90 });
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
  <div v-if="data" class="row">
    <button class="icon-btn" title="Change light type" @click="swapType">
      <i
        :class="[
          'bi',
          type === 'FLASHLIGHT' ? 'bi-lamp-fill' : 'bi-lightbulb-fill',
        ]"
      ></i>
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
      class="toggle-btn"
      :class="{ active: smooth }"
      title="Toggle smooth edge"
      @click="toggleSmoothness"
    >
      Smooth
    </button>
  </div>
</template>

<style scoped>

.range {
  display: flex;
  align-items: center;
  color: var(--text-disabled);
  gap: 4px;
}
input{
  width: 50px;
}
.toggle-btn{
  margin-left: auto;
}

</style>

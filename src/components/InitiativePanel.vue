<script setup lang="ts">
import { onMounted, watch } from "vue";
import type { Initiative } from "../scripts/types";
import OBR from "@owlbear-rodeo/sdk";

const props = defineProps<{
  initiative: Initiative | null;
  name: string;
}>();

function rainseTurnMsg() {
  OBR.notification.show(`${props.name}'s turn!`);
  emit("select");
}


const emit = defineEmits<{
  (e: "select"): void;
}>();

watch(
  () => props.initiative,
  (newValue, oldValue) => {
    if (newValue?.active && (!oldValue || !oldValue.active)) rainseTurnMsg();
  },
);
onMounted(() => {
  OBR.onReady(() => {
    if (props.initiative?.active) rainseTurnMsg();
    OBR.scene.onReadyChange((val) => {
      if (val && props.initiative?.active) rainseTurnMsg();
    });
  });
});
</script>
<template>
  <div v-if="initiative" class="row" :class="{ active: initiative.active }">
    <span class="label">Initiative</span>
    <span class="value">{{ initiative.count }}</span>

    <span v-if="initiative.active" class="turn-indicator"> Your turn </span>
  </div>
</template>
<style scoped>
.turn-indicator {
  margin-left: auto;
  color: var(--primary-light);
}
</style>

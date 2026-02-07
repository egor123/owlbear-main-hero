<script setup lang="ts">
import type { Initiative } from "../scripts/types";

defineProps<{
  initiative: Initiative | null;
}>();
</script>
<template>
  <div v-if="initiative" class="initiative" :class="{ active: initiative.active }">
    <span class="label">INIT</span>
    <span class="value">{{ initiative.count }}</span>

    <span v-if="initiative.active" class="turn-indicator">
      Your turn
    </span>
  </div>
</template>
<style scoped>
.initiative {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 4px 8px;
  border-radius: 6px;

  font-size: 12px;
  font-weight: 600;

  background: #2a2a2a;
  color: #bbb;
  border: 1px solid #444;
}

.label {
  font-size: 10px;
  opacity: 0.7;
}

.value {
  font-size: 14px;
  color: white;
}

/* Active turn */
.initiative.active {
  background: #2563eb;
  border-color: #3b82f6;
  color: white;
}

.turn-indicator {
  font-size: 10px;
  padding-left: 4px;
  opacity: 0.9;
}
</style>

<script setup lang="ts">
import type { Token, Dictionary } from "../scripts/types";
import OBR from "@owlbear-rodeo/sdk";

const props = defineProps<{
  tokens: Dictionary<Token>;
  selectedTokenId: string | null;
}>();

const emit = defineEmits<{
  (e: "update", value: Dictionary<Token>): void;
  (e: "selectToken", value: string): void;
}>();

async function openImageSelector() {
  if (!props.tokens) return;
  const loadedImgs = await OBR.assets.downloadImages(true);
  loadedImgs
    .filter((t) => t.type == "CHARACTER")
    .forEach((t) => {
      props.tokens[crypto.randomUUID()] = {
        label: t.text.plainText,
        labelType: "ADD",
        image: t.image,
        grid: t.grid,
      };
    });
  emit("update", {
    ...props.tokens,
  });
  if (!props.selectedTokenId && loadedImgs.length >= 1)
    emit("selectToken", Object.keys(props.tokens)[0] as string);
}

function selectToken(id: string) {
  emit("selectToken", id);
}

function removeToken(id: string) {
  delete props.tokens[id];
  emit("update", {
    ...props.tokens,
  });
}

function moveTokenUp(key: string) {
  const entries = Object.entries(props.tokens);
  const index = entries.findIndex(([k]) => k === key);

  if (index <= 0) return;
  const temp = entries[index - 1];
  const temp2 = entries[index];
  if (!temp || !temp2) return;
  entries[index] = temp;
  entries[index - 1] = temp2;
  emit("update", Object.fromEntries(entries));
}

function moveTokenDown(key: string) {
  const entries = Object.entries(props.tokens);
  const index = entries.findIndex(([k]) => k === key);

  if (index < 0 || index >= entries.length - 1) return;
  const temp = entries[index];
  const temp2 = entries[index + 1];
  if (!temp || !temp2) return;
  entries[index] = temp2;
  entries[index + 1] = temp;
  emit("update", Object.fromEntries(entries));
}
</script>

<template>
  <!-- Tokens -->
  <div class="tokens">
    <div class="tokens-header">
      <span>Tokens</span>
      <button class="add-btn" @click="openImageSelector()">＋</button>
    </div>

    <ul class="token-list">
      <li
        v-for="(token, key) in tokens"
        :key="key"
        class="token-row"
        :class="{ selected: key === selectedTokenId }"
        @click="selectToken(key)"
      >
        <img v-if="token" :src="token.image.url" class="token-img" />

        <input
          v-model="token.label"
          class="token-name"
          placeholder="Unnamed"
          @click.stop
        />

        <button
          class="icon-btn"
          title="Move up"
          @click="
            token.labelType = token.labelType == 'ADD' ? 'REPLACE' : 'ADD'
          "
        >
          {{ token.labelType == "ADD" ? "A" : "R" }}
        </button>
        <!-- Move up -->
        <button class="icon-btn" title="Move up" @click="moveTokenUp(key)">
          ⬆
        </button>

        <!-- Move down -->
        <button class="icon-btn" title="Move down" @click="moveTokenDown(key)">
          ⬇
        </button>

        <button
          class="remove-btn"
          title="Remove token"
          @click.stop="removeToken(key)"
        >
          ✕
        </button>
      </li>

      <li v-if="Object.keys(tokens).length === 0" class="empty">No tokens</li>
    </ul>
  </div>
</template>

<style scoped>
/* Tokens */
.tokens {
  margin-top: 12px;
}

.tokens-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.add-btn {
  border: none;
  background: #e6f0ff;
  color: #2563eb;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px 6px;
}

/* Token list */
.token-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 180px;
  overflow-y: auto;
}

/* Token row */
.token-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}

/* .token-row:hover {
  background: #f5f5f5;
} */

/* Selected state */
.token-row.selected {
  /* background: #eef4ff; */
  border-color: #3b82f6;
}

/* Token image */
.token-img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Token name */
.token-name {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  padding: 2px 4px;
}

.token-name:focus {
  outline: none;
  background: #3c3c3c;
  border-radius: 4px;
}

/* Remove button */
.remove-btn {
  border: none;
  background: transparent;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}

.remove-btn:hover {
  color: #dc2626;
}

.icon-btn {
  background: transparent;
  border: none;
  border-radius: 5px;
  /* background: transparent; */
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  /* pointer-events: none; */
  /* pointer-events: all; */
}

.icon-btn:hover {
  color: #515151;
}

/* Empty state */
.empty {
  font-size: 12px;
  color: #888;
  padding: 6px;
  text-align: center;
}
</style>

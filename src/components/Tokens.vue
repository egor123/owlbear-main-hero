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
  if (!props.selectedTokenId && Object.keys(props.tokens).length > 0) {
    emit("selectToken", Object.keys(props.tokens)[0] as string);
  }
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
      <button
        class="icon-btn-primary"
        title="Add tokens"
        @click="openImageSelector()"
      >
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>

    <ul class="token-list">
      <li
        v-for="(token, key) in tokens"
        :key="key"
        class="row"
        :class="{ active: key === selectedTokenId }"
        @click="selectToken(key)"
      >
        <img v-if="token" :src="token.image.url" class="token-img" />

        <input
          v-model="token.label"
          class="token-name"
          type="text"
          placeholder="Unnamed"
          @click.stop
        />

        <button
          class="icon-btn"
          title="Change label type"
          @click="
            token.labelType = token.labelType == 'ADD' ? 'REPLACE' : 'ADD'
          "
        >
          <i
            :class="[
              'bi',
              token.labelType === 'ADD' ? 'bi-plus-circle' : 'bi-arrow-repeat',
            ]"
          ></i>
        </button>
        <!-- Move up -->
        <button class="icon-btn" title="Move up" @click="moveTokenUp(key)">
          <i class="bi bi-arrow-up"></i>
        </button>

        <!-- Move down -->
        <button class="icon-btn" title="Move down" @click="moveTokenDown(key)">
          <i class="bi bi-arrow-down"></i>
        </button>

        <button
          class="icon-btn"
          title="Remove token"
          @click.stop="removeToken(key)"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </li>

      <li v-if="Object.keys(tokens).length === 0" class="empty">No tokens</li>
    </ul>
  </div>
</template>

<style scoped>
/* Tokens */

.tokens-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
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
.row {
  border-radius: 16px;
  cursor: pointer;
  border-color: none;
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
}

/* Empty state */
.empty {
  font-size: 12px;
  color: var(--text-disabled);
}
</style>

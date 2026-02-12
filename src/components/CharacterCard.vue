<script setup lang="ts">
// import type { Ref, ComputedRef } from "vue";
import { computed, onMounted, onUnmounted, watch } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import {
  type Character,
  type Token,
  type OwlTracker,
  type Dictionary,
  type Initiative,
  type LabelStyle,
  fonts,
} from "../scripts/types.ts";
import Tracker from "./Tracker.vue";
import Tokens from "./Tokens.vue";
import InitiativePanel from "./InitiativePanel.vue";
import LightPanel from "./LightPanel.vue";
import { focus } from "../scripts/playerUtils.ts";
import LabelPanel from "./LabelPanel.vue";
// ---- Props ----
const props = defineProps<{
  character: Character;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: "update", value: Character): void;
  (e: "moveUp", value: string): void;
  (e: "moveDown", value: string): void;
  (e: "selectCharacter", value: string | null): void;
  (e: "deleteCharacter", value: string): void;
}>();

const owlTrackers = computed<OwlTracker[] | null>(() => {
  return props.character.metadata["com.owl-trackers/trackers"] as OwlTracker[];
});

const lightData = computed<any | null>(() => {
  return props.character.metadata["rodeo.owlbear.dynamic-fog/light"];
});

async function updateLightData(updated: any) {
  props.character.metadata["rodeo.owlbear.dynamic-fog/light"] = updated;
}

const initiative = computed<Initiative | null>(() => {
  return (
    (props.character.metadata[
      "rodeo.owlbear.initiative-tracker/metadata"
    ] as Initiative) ?? null
  );
});

function updateTracker(updated: OwlTracker) {
  props.character.metadata["com.owl-trackers/trackers"] =
    owlTrackers.value?.map((t) => (t.id === updated.id ? updated : t)) ?? [];
}

async function showDeleteCharacterConfirm() {
  if (
    window.confirm(`Are you sure you want to delete "${props.character.name}"?`)
  ) {
    emit("deleteCharacter", props.character.id);
  }
}

let lastChange: Date | null = null;
let unsubscribe: any[] = [];

function updateItem(item: any, value: Character) {
  if (props.selected) {
    OBR.player.getRole().then((role) => {
      if (role === "PLAYER") {
        OBR.player.getName().then((name) => {
          if (name !== value.name) OBR.player.setName(value.name);
        });
        OBR.player.getColor().then((color) => {
          if (color !== value.color) OBR.player.setColor(value.color);
        });
      }
    });
  }
  const val: Character = JSON.parse(JSON.stringify(value));
  const token = val.tokens[val.selectedTokenId ?? ""];
  const metadata = JSON.parse(JSON.stringify(value.metadata));
  if (token) {
    item.image = token.image;
    item.grid = token.grid;
  }
  item.text.style.fontSize = value.labelStyle.size;
  item.text.style.fillColor = value.labelStyle.color;
  item.text.style.fontFamily = value.labelStyle.font;

  item.name = value.name;
  item.scale = { x: value.scale.x, y: value.scale.y };
  item.metadata = metadata;
  item.text.plainText = value.name;

  if (token) {
    if (token.labelType === "ADD" && token?.label)
      item.text.plainText += ` (${token.label})`;
    else if (token.labelType === "REPLACE") item.text.plainText = token.label;
  }
}

function update(value: Character) {
  if (!OBR.scene) return;
  OBR.scene.items
    .updateItems(
      (item) => item.id == props.character.id,
      (items: any[]) => {
        if (items && items.length > 0 && items[0]) {
          updateItem(items[0], value);
        }
      },
    )
    .catch(() => {});
}

async function onChange(items: any[]) {
  const playerItem = items.find((i) => i.id === props.character.id);
  if (playerItem) {
    const d = new Date(playerItem.lastModified);
    if (lastChange == null || d > lastChange) {
      lastChange = d;
      //TODO better checks (?!)
      if (
        props.character.scale.x != playerItem.scale.x ||
        props.character.scale.y != playerItem.scale.y
      )
        props.character.scale = {
          x: playerItem.scale.x,
          y: playerItem.scale.y,
        };
      const m1j = JSON.stringify(props.character.metadata);
      const m2j = JSON.stringify(playerItem.metadata);
      const metadata = JSON.parse(m2j);
      if (m1j != m2j) props.character.metadata = metadata; //FIXME!!!
    }
  }
}

watch(
  props.character,
  async (value) => {
    update(value);
    emit("update", value);
  },
  { deep: true },
);

// ---- Handle live scene updates ----
onMounted(() => {
  OBR.onReady(async () => {
    unsubscribe.push(OBR.scene.items.onChange(onChange));
    unsubscribe.push(
      OBR.scene.onReadyChange((ready) => {
        if (ready) update(props.character);
      }),
    );
  });
});

onUnmounted(() => {
  unsubscribe.forEach((f) => f?.());
});

// ---- Handlers ----

function moveTrackerDown(id: string) {
  const trackers = (owlTrackers.value ?? []) as OwlTracker[];
  const index = trackers.findIndex((t) => t.id === id);
  if (index < 0 || index >= trackers.length - 1) return;

  const next = [...trackers];
  const temp = next[index];
  const temp2 = next[index + 1];
  if (!temp || !temp2) return;
  next[index] = temp2;
  next[index + 1] = temp;

  props.character.metadata["com.owl-trackers/trackers"] = next;
}

function moveTrackerUp(id: string) {
  const trackers = (owlTrackers.value ?? []) as OwlTracker[];
  const index = trackers.findIndex((t) => t.id === id);
  if (index < 1 || index >= trackers.length) return;

  const next = [...trackers];
  const temp = next[index];
  const temp2 = next[index - 1];
  if (!temp || !temp2) return;
  next[index] = temp2;
  next[index - 1] = temp;

  props.character.metadata["com.owl-trackers/trackers"] = next;
}

function updateTokens(tokens: Dictionary<Token>) {
  props.character.tokens = tokens;
}

function selectToken(id: string | null) {
  props.character.selectedTokenId = id;
}

function updateLabelStyle(style: LabelStyle) {
  props.character.labelStyle = style;
}
</script>

<template>
  <div
    class="player-card"
    :class="{ selected: selected, collapsed: character.collapsed }"
  >
    <!-- Header -->
    <div class="header">
      <button
        class="icon-btn"
        @click="character.collapsed = !character.collapsed"
        :aria-label="character.collapsed ? 'Expand' : 'Collapse'"
      >
        <i
          :class="[
            'bi',
            character.collapsed ? 'bi-caret-right-fill' : 'bi-caret-down-fill',
          ]"
        ></i>
      </button>
      <button
        @click="emit('selectCharacter', selected ? null : character.id)"
        class="icon-btn"
        :title="selected ? 'Deselect' : 'Select'"
      >
        <i :class="['bi', selected ? 'bi-check-circle-fill' : 'bi-circle']"></i>
      </button>

      <div class="name-wrapper">
        <input
          v-model="character.name"
          type="text"
          placeholder="Enter name"
          :style="{ fontFamily: fonts[character.labelStyle.font]?.css, color: character.labelStyle.color, fontSize: (character.labelStyle.size*.8) + 'px'}"
        />

        <div class="label-panel-popover">
          <LabelPanel
            :labelStyle="character.labelStyle"
            @update="updateLabelStyle"
          />
        </div>
      </div>
      <input
        type="color"
        title="Character Color"
        :value="character.color"
        @change="character.color = ($event.target as HTMLInputElement).value"
      />
      <button class="icon-btn" @click="focus(character.id)" title="Focus">
        <i class="bi bi-geo-fill"></i>
      </button>
      <button
        class="icon-btn"
        @click="emit('moveUp', character.id)"
        title="Move Up"
      >
        <i class="bi bi-arrow-up"></i>
      </button>
      <button
        class="icon-btn"
        @click="emit('moveDown', character.id)"
        title="Move Down"
      >
        <i class="bi bi-arrow-down"></i>
      </button>
      <button
        class="icon-btn"
        @click="showDeleteCharacterConfirm"
        title="Delete"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Foldable body -->
    <div class="card-body" v-show="!character.collapsed">
      <InitiativePanel
        :initiative="initiative"
        :name="character.name"
        @select="emit('selectCharacter', character.id)"
      />
      <LightPanel :data="lightData" @update="updateLightData" />
      <Tracker
        v-for="tracker in owlTrackers"
        :key="tracker.id"
        :tracker="tracker"
        @update="updateTracker"
        @move-down="moveTrackerDown"
        @move-up="moveTrackerUp"
      />

      <Tokens
        :tokens="character.tokens"
        :selected-token-id="character.selectedTokenId"
        @update="updateTokens"
        @select-token="selectToken"
      />
    </div>
  </div>
</template>

<style scoped>
.player-card {
  width: 100%;
  border: 1px solid var(--text-secondary);
  border-radius: 16px;
  background-color: var(--bg-paper);
}
.card-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  /* gap: 10px; */
}

.player-card.selected {
  border-color: var(--primary-main);
}

.player-card.selected .header {
  border-color: var(--primary-main);
}
.player-card.collapsed .header {
  border-color: transparent;
}
/* Header layout */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid;
  border-color: var(--text-secondary);
  padding: 0 10px;
}

.name-wrapper {
  position: relative;
  display: flex;
  min-width: 0;
  flex: .8;
}

/* Floating label settings panel */
.label-panel-popover {
  display: none;
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%) translateY(50%);
  width: fit-content;
}

.name-wrapper:focus-within .label-panel-popover {
  display: block;
}

/* Name input = main visual focus */
.header input {
  width: 100%;
  min-width: 0;
  font-weight: 600;
  border: 1.5px solid;
  height: 22px;
  background: color-mix(in srgb, var(--secondary-contrast) 10%, transparent);
  border-color: color-mix(in srgb, var(--secondary-contrast) 20%, transparent);
}

/* Focus state */
.header input:focus {
  outline: none;
  border-color: var(--primary-light);
}
</style>

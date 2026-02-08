<script setup lang="ts">
// import type { Ref, ComputedRef } from "vue";
import { computed, onMounted, onUnmounted, watch } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import type {
  Character,
  Token,
  OwlTracker,
  Dictionary,
  Initiative,
  LabelStyle,
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
  (e: "selectCharacter", value: string): void;
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

async function update(value: Character) {
  if (!OBR.scene) return;
  await OBR.scene.items.updateItems(
    (item) => item.id == props.character.id,
    (items: any[]) => {
      if (items && items.length > 0 && items[0]) {
        updateItem(items[0], value);
      }
    },
  );
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
        class="fold-btn"
        @click="character.collapsed = !character.collapsed"
      >
        {{ character.collapsed ? "▶" : "▼" }}
      </button>

      <button @click="emit('selectCharacter', character.id)" title="Select">
        S
      </button>

      <div class="name-wrapper">
        <input v-model="character.name" type="text" placeholder="Enter name" />

        <div class="label-panel-popover">
          <LabelPanel
            :labelStyle="character.labelStyle"
            @update="updateLabelStyle"
          />
        </div>
      </div>
      <input
        type="color"
        title="Label color"
        :value="character.color"
        @change="character.color = ($event.target as HTMLInputElement).value"
      />
      <button @click="focus(character.id)" title="Focus">F</button>
      <button @click="emit('moveUp', character.id)" title="Move Up">⬆</button>
      <button @click="emit('moveDown', character.id)" title="Move Down">
        ⬇
      </button>
      <button @click="showDeleteCharacterConfirm" title="Delete">✕</button>
    </div>

    <!-- Foldable body -->
    <div class="card-body" v-show="!character.collapsed">
      <InitiativePanel :initiative="initiative" />
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
  font-family: system-ui, sans-serif; /* background: #fff; */
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  margin: 0;
}

.player-card.selected {
  border: 1px solid #3b82f6;
}

.player-card.selected .header {
  border: 1px solid #3b82f6;
}

/* Header layout */
.header {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 0;
  padding: 0 10px 0 10px;
}
.header input[type="color"] {
  flex: none;
  width: 22px;
  padding: 0;
  border: none;
  background: none;
}

/* Small icon buttons */
.header button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;

  background: #2a2a2a;
  color: #ddd;
}

.header button:hover {
  background: #3a3a3a;
}

.name-wrapper {
  position: relative;
  flex: 1;
}

/* Floating label settings panel */
.label-panel-popover {
  display: none;
  position: absolute;
  top: calc(100%);
  left: 0;
  z-index: 20;

  width: fit-content;
}

.name-wrapper:focus-within .label-panel-popover {
  display: block;
}

/* Fold button slightly larger / clearer */
.fold-btn {
  font-size: 13px;
}

/* Name input = main visual focus */
.header input {
  flex: 1;
  min-width: 0;
  /* max-width: fit-content; */
  /* width:auto; */
  height: 26px;
  padding: 4px 6px;

  font-size: 14px;
  font-weight: 600;

  border-radius: 6px;
  border: 1px solid #555;
  background: #1f1f1f;
  color: white;
}

/* Focus state */
.header input:focus {
  outline: none;
  border-color: #3b82f6;
  background: #242424;
}

/* Selected card accent */
.player-card.selected .header input {
  border-color: #3b82f6;
}

.card-body {
  margin-top: 10px;
}
</style>

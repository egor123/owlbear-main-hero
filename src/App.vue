<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import OBR, {
  buildImage,
  Math2,
  type Grid,
  type Item,
  type Vector2,
  type Light,
} from "@owlbear-rodeo/sdk";
import CharacterCard from "./components/CharacterCard.vue";
import { usePlayerStore } from "./scripts/store.ts";
import { getPluginId } from "./pluginId.ts";
import { focus } from "./scripts/playerUtils";

const store = usePlayerStore();

const ANIMATION_DURATION = 300;
const PREANIMATION_DELAY = 20;

// ---- state ----
let player: Item | null = null;
let isMoving = false;
let gridDpi = 150;

// ---- Subscriptions ----
let unsubscribe: any[] = [];
// let interaction;

// ---- Movement ----

async function movePlayer() {
  if (!player || isMoving) return;
  const currentPlayerId = player.id;
  isMoving = true;

  const o = gridDpi / 2;
  let startTime = performance.now();
  let lastTime = startTime;
  let startPos: Vector2 | null = null;
  let targetPos: Vector2 | null = null;
  let targetAngle = 0;
  let cameraPos = await OBR.viewport.getPosition();
  const width = await OBR.viewport.getWidth();
  const height = await OBR.viewport.getHeight();
  const scale = await OBR.viewport.getScale();

  await new Promise((resolve) => setTimeout(resolve, PREANIMATION_DELAY));

  let interaction = await OBR.interaction.startItemInteraction(player);
  const [update, stop] = interaction;

  async function animate(now: number) {
    const lerp = (start: number, end: number, speed: number) =>
      start + (end - start) * speed;
    const t = Math.min((now - startTime) / ANIMATION_DURATION, 1);
    const d = Math.min(1, (now - lastTime) / 1000);
    // const eased = 1 - Math.pow(1 - t, 3); // TODO try different funcs + durations
    const eased = t;
    let skip = false;

    // set pos + check if reachable
    if (!player || currentPlayerId !== player.id) {
      stop();
      isMoving = false;
      return;
    }

    if (startPos == null) {
      const p = await OBR.scene.items.getItems([currentPlayerId]);
      if (p[0] == null) {
        stop();
        isMoving = false;
        return;
      }
      startPos = p[0].position;
    }
    if (targetPos == null) {
      const dir = getMoveDir();
      const rad = Math.atan2(dir.x, -dir.y);
      targetAngle = rad * (180 / Math.PI);
      targetPos = {
        x: Math.round(dir.x + (startPos.x - o) / gridDpi) * gridDpi + o,
        y: Math.round(dir.y + (startPos.y - o) / gridDpi) * gridDpi + o,
      };
      await OBR.scene.items.updateItems([currentPlayerId], (items) => {
        if (items[0] && targetPos) {
          items[0].position = targetPos;
          setPlayerRotation(items[0], targetAngle);
        }
      });

      await OBR.scene.items.updateItems([currentPlayerId], (items) => {
        if (!targetPos || !items[0] || !startPos) return;
        if (
          Math.abs(targetPos.x - items[0].position.x) > 5 ||
          Math.abs(targetPos.y - items[0].position.y) > 5
        ) {
          skip = true;
          targetPos = { x: startPos.x, y: startPos.y };
          items[0].position = targetPos;
        } else {
          targetPos = { x: items[0].position.x, y: items[0].position.y };
        }
      });
    }
    if (!skip) {
      const currentPos = {
        x: startPos.x + (targetPos.x - startPos.x) * eased,
        y: startPos.y + (targetPos.y - startPos.y) * eased,
      };

      const viewportPos = {
        x: lerp(cameraPos.x, targetPos.x * -scale + width / 2, d * 0.02),
        y: lerp(cameraPos.y, targetPos.y * -scale + height / 2, d * 0.02),
      };
      OBR.viewport.setScale(scale);
      OBR.viewport.setPosition(viewportPos);
      cameraPos = viewportPos;
      update((item) => {
        item.position = currentPos;
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION));
    }
    if (!skip && t < 1) {
      requestAnimationFrame(animate);
    } else {
      const dir = getMoveDir();
      if (dir.x == 0 && dir.y == 0) {
        //finished
        stop();
        isMoving = false;
      } else {
        // clear state + continue
        startTime = performance.now();
        lastTime = startTime;
        startPos = { x: targetPos.x, y: targetPos.y };
        targetPos = null;
        requestAnimationFrame(animate);
      }
    }
  }

  requestAnimationFrame(animate);
}

async function setPlayerRotation(player: Item, angle: number) {
  if (!player) return;
  let data: any = player.metadata["rodeo.owlbear.dynamic-fog/light"];
  if (!data) return;
  data.rotation = (360 + angle) % 360;
  player.metadata["rodeo.owlbear.dynamic-fog/light"] = data;
}

async function rotatePlayer(dir: number) {
  if (!player || isMoving) return;
  const id = player.id;
  await OBR.scene.items.updateItems([id], (player) => {
    if (!player[0]) return;
    let data: any = player[0].metadata["rodeo.owlbear.dynamic-fog/light"];
    if (!data) return;
    data.rotation += dir * (360 / 8);
    data.rotation = (360 + data.rotation) % 360;
    player[0].metadata["rodeo.owlbear.dynamic-fog/light"] = data;
  });
}

// ---- Keyboard ----
const pressedKeys = new Set();

function getMoveDir() {
  let dx = 0;
  let dy = 0;

  if (pressedKeys.has("w") || pressedKeys.has("arrowup")) dy -= 1;
  if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) dy += 1;
  if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) dx -= 1;
  if (pressedKeys.has("d") || pressedKeys.has("arrowright")) dx += 1;

  return { x: dx, y: dy };
}

function handleKeyUp(event: KeyboardEvent) {
  pressedKeys.delete(event.key.toLowerCase());
}

function handleKeyDown(event: KeyboardEvent) {
  if (document.activeElement instanceof HTMLInputElement) {
    pressedKeys.clear();
    return;
  }
  const key = event.key.toLowerCase();
  if (key.includes("f") && store.currentCharacterID) {
    focus(store.currentCharacterID, false);
  }
  if (key.includes("q")) {
    rotatePlayer(-1);
  }
  if (key.includes("e")) {
    rotatePlayer(1);
  }
  if (
    ![
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key)
  ) {
    return;
  }

  pressedKeys.add(key);
  movePlayer();
}

watch(store.data, async (data) => {
  if (!player || player.id !== data.selectedCharacterId) {
    const i = await OBR.scene.items.getItems(
      (i) => i.id === data.selectedCharacterId,
    );
    player = i[0] ?? null;
    updateLights(await OBR.scene.local.getItems(lightFilter));
  }
});

async function onItemsChange(items: Item[]) {
  const id = store.currentCharacterID;
  if (id == null) player = null;
  else player = items.find((i) => i.id === id) ?? null;
}
function onGridChange(grid: Grid) {
  gridDpi = grid.dpi;
}

function lightFilter(item: Item) {
  return (
    item.layer === "FOG" &&
    item.type == "LIGHT" &&
    (item as Light).lightType === "PRIMARY"
  );
}

async function updateLights(items: Item[]) {
  // if ((await OBR.player.getRole()) === "GM") return;
  const lights = items.filter(lightFilter);
  const id = store.currentCharacterID;
  let playerIsVisible = false;
  if (id) {
    const token = await OBR.scene.items.getItems([id]);
    playerIsVisible = token[0]?.visible ?? false;
  }
  OBR.scene.local.updateItems(lights, (items) => {
    items.forEach((l) => {
      l.visible = id !== null && l.attachedTo === id && playerIsVisible;
    });
  });
}

function onLocalSceneChange(items: Item[]) {
  updateLights(items);
}

async function spawnCharacter(pos: Vector2) {
  const char = store.currentCharacter;
  if (!char || !char.selectedTokenId) return;

  const token = (await OBR.scene.items.getItems([char.id]))[0];
  if (token) {
    await OBR.scene.items.updateItems([char.id], (items) => {
      if (items[0]) {
        items[0].position = pos;
        items[0].visible = true;
      }
    });
    return;
  }
  let img = char.tokens[char.selectedTokenId];
  img = JSON.parse(JSON.stringify(img));
  if (!img) return;

  let label = char.name;
  if (img?.label) label += ` (${img.label})`;
  const metadata = JSON.parse(JSON.stringify(char.metadata));

  const item = buildImage(img.image, img.grid)
    .id(char.id)
    .createdUserId(await OBR.player.getId())
    .lastModified(Date.now().toString())
    .layer("CHARACTER")
    .name(char.name)
    .position(pos)
    .scale({ x: char.scale.x, y: char.scale.y })
    .metadata(metadata)
    .plainText(label)
    .build();
  await OBR.scene.items.addItems([item]);
}

function addCharacterSpawnMenu() {
  OBR.contextMenu.create({
    id: getPluginId("spawn-menu"),
    icons: [
      {
        icon: "/icon.svg",
        label: "Spawn Character",
        filter: {
          min: 0,
          max: 0,
          permissions: ["CREATE"],
        },
      },
    ],
    onClick(ctx, _) {
      spawnCharacter(ctx.selectionBounds.center);
    },
  });
}

function addPartySpawnMenu() {
  OBR.broadcast.onMessage(getPluginId("/spaw"), async (evt) => {
    if ((await OBR.player.getRole()) == "GM") return;
    const origin = evt.data as Vector2;
    const maxDistance = await OBR.scene.grid.getDpi();
    const minDistance = maxDistance / 4;
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const offset: Vector2 = {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
    spawnCharacter(Math2.add(origin, offset));
  });
  OBR.contextMenu.create({
    id: getPluginId("spawn-menu-gm"),
    icons: [
      {
        icon: "/icon.svg",
        label: "Spawn Party",
        filter: {
          roles: ["GM"],
          min: 0,
          max: 0,
          permissions: ["CREATE"],
        },
      },
    ],
    onClick(ctx, _) {
      OBR.broadcast.sendMessage(
        getPluginId("/spaw"),
        ctx.selectionBounds.center,
        { destination: "REMOTE" },
      );
    },
  });
}

// ---- Lifecycle ----
onMounted(() => {
  OBR.onReady(() => {
    unsubscribe.push(OBR.scene.items.onChange(onItemsChange));
    unsubscribe.push(OBR.scene.grid.onChange(onGridChange));
    unsubscribe.push(OBR.scene.local.onChange(onLocalSceneChange));
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    addCharacterSpawnMenu();
    addPartySpawnMenu();
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  unsubscribe.forEach((f) => f?.());
});
</script>
<template>
  <button @click="store.addNewCharacter">New</button>
  <CharacterCard
    v-for="charcter in store.data.characters"
    :character="charcter"
    :selected="store.currentCharacterID === charcter.id"
    @select-character="store.selectCharacter"
    @delete-character="store.removeCharacter"
    @move-up="store.moveCharacterUp"
    @move-down="store.moveCharacterDown"
  />
</template>

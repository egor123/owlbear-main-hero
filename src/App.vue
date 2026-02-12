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
let isCameraAnimated = false;
let gridDpi = 150;
let targetPos: Vector2 | null = null;

// ---- Subscriptions ----
const unsubscribe: any[] = [];

// ---- Movement ----

async function moveCamera() {
  if (!player || isCameraAnimated) return;
  isCameraAnimated = true;

  const accel = 15;
  const damping = 10;
  const fadeOutTime = 500;

  let lastTime = performance.now();
  let stopTime = lastTime;

  let velocity = { x: 0, y: 0 };

  const stop = () => {
    isCameraAnimated = false;
  };

  const [width, height, scale, position] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
    OBR.viewport.getScale(),
    OBR.viewport.getPosition(),
  ]);

  const offset = { x: width / 2, y: height / 2 };
  let cameraPos = Math2.divide(Math2.subtract(position, offset), -scale);

  async function animate(now: number) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);

    const [width, height, scale] = await Promise.all([
      OBR.viewport.getWidth(),
      OBR.viewport.getHeight(),
      OBR.viewport.getScale(),
    ]);
    const offset = { x: width / 2, y: height / 2 };

    if (targetPos) {
      const toTarget = Math2.subtract(targetPos, cameraPos);

      const accelFactor = isMoving
        ? accel
        : Math.max(0, 1 - (now - stopTime) / fadeOutTime) * accel;

      velocity = Math2.add(
        velocity,
        Math2.multiply(toTarget, accelFactor * dt),
      );

      const damp = Math.exp(-damping * dt);
      velocity = Math2.multiply(velocity, damp);

      cameraPos = Math2.add(cameraPos, Math2.multiply(velocity, dt));
      const pos = Math2.add(Math2.multiply(cameraPos, -scale), offset);
      await OBR.viewport.setPosition(pos);
    }

    if (isMoving) stopTime = now;
    else if (now >= stopTime + fadeOutTime) {
      stop();
      return;
    }
    lastTime = now;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

async function movePlayer() {
  if (!player || isMoving) return;

  const currentPlayerId = player.id;
  isMoving = true;

  const o = gridDpi / 2;
  let startTime = performance.now();
  let startPos: Vector2 | null = null;
  let targetAngle = 0;
  targetPos = null;
  await new Promise((resolve) => setTimeout(resolve, PREANIMATION_DELAY));

  let iteractionStart = performance.now();
  let interaction: any = await OBR.interaction.startItemInteraction(player);
  let [update, stop] = interaction;

  async function animate(now: number) {
    const t = Math.min((now - startTime) / ANIMATION_DURATION, 1);
    // const eased = 1 - Math.pow(1 - t, 3); // TODO try different funcs + durations
    const eased = t;
    let skip = false;

    // set pos + check if reachable
    if (!player || currentPlayerId !== player.id) {
      stop();
      isMoving = false;
      return;
    }

    if (!interaction || now - iteractionStart > 10000) {
      await stop();
      iteractionStart = performance.now();
      interaction = await OBR.interaction.startItemInteraction(player);
      [update, stop] = interaction;
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

      moveCamera();
      update((item: Item) => {
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

function rotatePlayer(dir: number) {
  if (!player || isMoving) return;
  const id = player.id;
  OBR.scene.items
    .updateItems([id], (player) => {
      if (!player[0]) return;
      let data: any = player[0].metadata["rodeo.owlbear.dynamic-fog/light"];
      if (!data) return;
      data.rotation += dir * (360 / 8);
      data.rotation = (360 + data.rotation) % 360;
      player[0].metadata["rodeo.owlbear.dynamic-fog/light"] = data;
    })
    .catch(() => {});
}

// ---- Keyboard ----
const pressedKeys = new Set();

function getMoveDir() {
  let dx = 0;
  let dy = 0;

  if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) dy -= 1;
  if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) dy += 1;
  if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) dx -= 1;
  if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) dx += 1;

  return { x: dx, y: dy };
}

function handleKeyUp(event: KeyboardEvent) {
  pressedKeys.delete(event.code);
}

function handleKeyDown(event: KeyboardEvent) {
  if (document.activeElement instanceof HTMLInputElement) {
    pressedKeys.clear();
    return;
  }
  const key = event.code;

  if (key.startsWith("Digit")) {
    const i = parseInt(key.substring(5)) - 1;
    const id = Object.keys(store.data.characters)[i];
    if (id) store.selectCharacter(id);
  }
  if (key === "KeyR" && store.currentCharacterID && player) {
    OBR.scene.items
      .updateItems([player], (p) => {
        if (p[0]) p[0].scale.x = -p[0].scale.x;
      })
      .catch(() => {});
  }
  if (key === "KeyF" && store.currentCharacterID) {
    focus(store.currentCharacterID, false);
  }
  if (key === "KeyQ") {
    rotatePlayer(-1);
  }
  if (key === "KeyE") {
    rotatePlayer(1);
  }
  if (
    ![
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
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
  if ((await OBR.player.getRole()) === "GM") return;
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

  const token = await OBR.scene.items.getItems([char.id]);
  if (token.length) {
    await OBR.scene.items.deleteItems(token.map((t) => t.id));
  }
  let img = char.tokens[char.selectedTokenId];
  img = JSON.parse(JSON.stringify(img));
  if (!img) return;

  let label = char.name;
  if (img.labelType === "ADD" && img?.label) label += ` (${img.label})`;
  else if (img.labelType === "REPLACE") label = img.label;

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
  item.text.style.fontSize = char.labelStyle.size;
  item.text.style.fillColor = char.labelStyle.color;
  item.text.style.fontFamily = char.labelStyle.font;

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
  <CharacterCard
    v-for="charcter in store.data.characters"
    :key="charcter.id"
    :character="charcter"
    :selected="store.currentCharacterID === charcter.id"
    @select-character="store.selectCharacter"
    @delete-character="store.removeCharacter"
    @move-up="store.moveCharacterUp"
    @move-down="store.moveCharacterDown"
  />
  <button class="btn-new" @click="store.addNewCharacter">New</button>
</template>

<style scoped>
.btn-new {
  margin-top: 10px;
}
</style>

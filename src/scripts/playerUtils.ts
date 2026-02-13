import OBR, { Math2 } from "@owlbear-rodeo/sdk";
import type { Item } from "@owlbear-rodeo/sdk";

export async function getPlayerFilter() {
    const id = await OBR.player.getId();
    return (i: Item) => i.id === id;
}

export async function focus(id: string, select = true) {
    const token = await OBR.scene.items.getItems([id]);
    if (!token[0]) return;
    const scale = await OBR.viewport.getScale();
    const width = await OBR.viewport.getWidth();
    const height = await OBR.viewport.getHeight();
    const pos = Math2.add(Math2.multiply(token[0].position, -scale), {
        x: width / 2,
        y: height / 2,
    });
    OBR.viewport.animateTo({ scale: scale, position: pos });
    if (select) OBR.player.select([id]).catch(() => {});
}
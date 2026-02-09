import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { PlayerData, Character } from "../scripts/types";
import OBR from "@owlbear-rodeo/sdk";
import { focus } from "./playerUtils";

const STORAGE_KEY = "com.lostbyte.mainhero/data";

function loadFromStorage(): PlayerData {
    let data: PlayerData | null = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) throw new Error("empty");
        data = JSON.parse(raw);
    } catch {

    }
    if (data) return data;
    const char = createCharacter();
    return {
        characters: { [char.id]: char },
        selectedCharacterId: char.id,
    };
}
function createCharacter() {
    const defaultCharacter: Character = {
        id: crypto.randomUUID(),
        name: "",
        color: "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0"),
        collapsed: false,
        label: "",
        labelStyle: {color: "#ffffff", size: 24, font: "Roboto"},
        scale: { x: 1, y: 1 },
        metadata: {},
        selectedTokenId: null,
        tokens: {},
    }
    return defaultCharacter;
}
export const usePlayerStore = defineStore("player", () => {
    // ---- state ----
    const data = ref<PlayerData>(loadFromStorage());
    const currentCharacterID = computed<string | null>(() => {
        return data.value.selectedCharacterId;
    });
    // ---- getters ----
    const currentCharacter = computed<Character | null>(() => {
        if (!data.value.selectedCharacterId) return null;
        return (
            data.value.characters[data.value.selectedCharacterId] ?? null
        );
    });

    // ---- actions ----
    function addNewCharacter() {
        const char = createCharacter()
        data.value.characters[char.id] = char;
    }

    async function selectCharacter(id: string | null) {
        data.value.selectedCharacterId = id;
        if(id) focus(id, false);
        if ((await OBR.player.getRole()) == "PLAYER" && currentCharacter.value) {
            OBR.player.setName(currentCharacter.value.name)
            OBR.player.setColor(currentCharacter.value.color)
        }
    }

    function upsertCharacter(character: Character) {
        data.value.characters[character.id] = character;
    }

    function removeCharacter(id: string) {
        delete data.value.characters[id];
        if (data.value.selectedCharacterId === id) {
            data.value.selectedCharacterId = null;
        }
    }

    function moveCharacterUp(id: string) {
        const entries = Object.entries(data.value.characters);
        const index = entries.findIndex(([k]) => k === id);

        if (index <= 0) return;
        const temp = entries[index - 1];
        const temp2 = entries[index];
        if (!temp || !temp2) return;
        entries[index] = temp;
        entries[index - 1] = temp2;

        data.value.characters = Object.fromEntries(entries);
    }
    function moveCharacterDown(id: string) {
        const entries = Object.entries(data.value.characters);
        const index = entries.findIndex(([k]) => k === id);

        if (index < 0 || index >= entries.length - 1) return;
        const temp = entries[index];
        const temp2 = entries[index + 1];
        if (!temp || !temp2) return;
        entries[index] = temp2;
        entries[index + 1] = temp;

        data.value.characters = Object.fromEntries(entries);
    }
    // ---- persistence ----
    watch(
        data,
        (val) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        },
        { deep: true }
    );

    return {
        // state
        data,

        // getters
        currentCharacter,
        currentCharacterID,
        // actions
        addNewCharacter,
        selectCharacter,
        upsertCharacter,
        removeCharacter,
        moveCharacterUp,
        moveCharacterDown,
    };
});

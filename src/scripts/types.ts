import type { Metadata, ImageContent, ImageGrid, Vector2 } from "@owlbear-rodeo/sdk";

export interface PlayerData{
    characters: Dictionary<Character>;
    selectedCharacterId: string | null;
}

export interface LightData{
    type: "NORMAL" | "FLASHLIGHT";
    range: number;
    smooth: boolean; // togglable edge style
}

export interface Character {
    id: string;
    name: string;
    collapsed: boolean;
    label: string;
    scale: Vector2;
    metadata: Metadata;
    selectedTokenId: string | null;
    tokens: Dictionary<Token>;
}

export interface Dictionary<T> {
    [key: string]: T
}

export interface Token {
    label: string;
    image: ImageContent;
    grid: ImageGrid;
}

export interface OwlTracker {
    id: string;
    name: string | null;
    variant: ("checkbox" | "value" | "counter" | "value-max");
    color: number; // int 1-9
    value: number;
    checked: boolean | null;
    max: number | null; // only for "value-max"
    inlineMath: boolean | null; // dunno... ignore this i guess
    showOnMap: boolean | null;
}

export interface Initiative{
    count: number; // characters initiative score
    active: boolean; // if current turn is characters turn
}
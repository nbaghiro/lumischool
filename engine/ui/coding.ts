// The compiled-scene side of coding interactions. A pack contains only concrete scene data, so the
// child view must choose a runnable node without importing notation or the scratchpad. This module
// keeps that choice and the geometry used by prediction controls in one pure place.

import type { PackItem, PackQuestion } from "../pack";
import { parse } from "../coding";
import { valuesOf, type Box, type Scene, type SceneNode } from "../scene";
import { RUNS, setupOf, type Setup } from "../parts/coding/setup";

export type CodingMode = "run" | "toy" | "build";

export interface CodingTarget {
    mode: CodingMode;
    node: SceneNode;
    setup: Setup | null;
    /** A listing beside a runnable node, only when it is the unique readable listing. */
    listing: SceneNode | null;
}

const TOYS = new Set(["lamps", "sortcards", "sortnet", "cups"]);
const RUNNABLE = new Set(
    Object.keys(RUNS).filter((type) => type !== "program" && type !== "blocks"),
);

const isCodeNode = (node: SceneNode): boolean => RUNNABLE.has(node.type);

/** The concrete node named by a check setting, when the setting names one. */
const named = (scene: Scene, id: string | undefined): SceneNode | null =>
    id ? (scene.nodes.find((node) => node.id === id) ?? null) : null;

/** The program lines a compiled node carries, or null when it is a plan/partial listing. */
const codeOf = (node: SceneNode): string[] | null => {
    const params = valuesOf(node.v);
    const key = RUNS[node.type];
    const value = key ? params[key] : undefined;
    if (!Array.isArray(value) || !value.every((line): line is string => typeof line === "string"))
        return null;
    return value;
};

/** Whether a listing contains a complete program the interpreter can read. */
export const readableListing = (node: SceneNode): boolean => {
    const code = codeOf(node);
    return (
        code !== null &&
        setupOf(node.type, valuesOf(node.v)) !== null &&
        parse(code).problems.length === 0
    );
};

/**
 * Chooses the interaction for one compiled question. Explicit checker settings win, which matters
 * when a scene contains two turtles or a key listing beside the runnable drawing.
 */
export function codingTarget(q: PackQuestion, item: PackItem): CodingTarget | null {
    const scene = q.scene;
    if (!scene) return null;
    if (item.check?.name === "coding.builds") {
        const id = item.check.settings.of;
        const node = named(scene, id) ?? scene.nodes.find(isCodeNode);
        return node
            ? { mode: "build", node, setup: setupOf(node.type, valuesOf(node.v)), listing: null }
            : null;
    }
    const explicit =
        item.check?.name === "coding.runs" ? named(scene, item.check.settings.of) : null;
    const node =
        (explicit && (isCodeNode(explicit) || TOYS.has(explicit.type)) ? explicit : null) ??
        scene.nodes.find(isCodeNode) ??
        scene.nodes.find((n) => TOYS.has(n.type));
    if (!node) return null;
    const mode: CodingMode = isCodeNode(node) ? "run" : "toy";
    const listing =
        mode === "run"
            ? scene.nodes
                  .filter((n) => n.type === "program" || n.type === "blocks")
                  .filter(readableListing)
            : [];
    return {
        mode,
        node,
        setup: mode === "run" ? setupOf(node.type, valuesOf(node.v)) : null,
        listing: listing.length === 1 ? (listing[0] ?? null) : null,
    };
}

/** A runnable node's box, used by prediction overlays and pointer hit areas. */
export const boxOf = (scene: Scene, target: CodingTarget): Box | null =>
    scene.boxes[target.node.id] ?? null;

/** The grid dimensions used by a prediction target, or null for non-grid programs. */
export const gridOf = (target: CodingTarget): { cols: number; rows: number } | null => {
    const world = target.setup?.world;
    return world && world.cols > 1 && world.rows > 1
        ? { cols: world.cols, rows: world.rows }
        : null;
};

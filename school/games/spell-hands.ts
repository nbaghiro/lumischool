import type { Part, Scene } from "../../engine/motion/scene";
import { SPRINGS } from "../../engine/motion/spring";
import type { Position } from "./games";
import type { Choice, Ctx, Handle, Session } from "./hands";

function filled(pos: Position): string[] {
    const values = pos.board.parts.find((p) => p.art === "soundboxes")?.params.filled;
    return Array.isArray(values) ? values.filter((s): s is string => typeof s === "string") : [];
}

/** Reordering still travels through the spelling mechanic's legal take-out/put-in moves. */
export function spellSequence(pos: Position, sounds: readonly string[]): Choice {
    const moves: number[] = [];
    let here = pos;
    const original = filled(pos);
    let prefix = 0;
    while (prefix < original.length && original[prefix] === sounds[prefix]) prefix++;
    while (filled(here).length > prefix) {
        const i = here.moves.findIndex((m) => m.chip.text === "back");
        if (i < 0) return { moves: [] };
        moves.push(i);
        const move = here.moves[i];
        if (!move) return { moves: [] };
        here = move.next();
    }
    for (const sound of sounds.slice(prefix)) {
        const i = here.moves.findIndex((m) => m.chip.text === sound);
        const move = here.moves[i];
        if (!move) return { moves: [] };
        moves.push(i);
        here = move.next();
    }
    return { moves };
}

export function spellHands(initial: Position, ctx: Ctx): Session<Position> {
    const sounds = initial.moves.flatMap((m) =>
        m.chip.text && m.chip.text !== "back" ? [m.chip.text] : [],
    );
    const boxCount = Number(
        initial.board.parts.find((p) => p.art === "soundboxes")?.params.boxes ?? 3,
    );
    let wide = ctx.stage.room >= 900;
    const width = () => (wide ? 50 : 24);
    const slot = (i: number) => ({
        x: (wide ? 25 : 0) + (24 - boxCount * 3) / 2 + i * 3,
        y: wide ? 3 : 12,
    });
    const home = (i: number) => ({
        x: (wide ? 26 : 2) + (i % 5) * 4,
        y: (wide ? 12 : 19) + Math.floor(i / 5) * 5,
    });
    const tile = (key: string, text: string, at: { x: number; y: number }): Part => ({
        key,
        art: "soundboxes",
        at,
        params: { boxes: 1, filled: [text], counters: false },
        z: 5,
    });
    return {
        glide: SPRINGS.snap,
        parts(pos): Scene {
            wide = ctx.stage.room >= 900;
            const picture = pos.board.parts.find((p) => p.art !== "soundboxes");
            const parts: Part[] = picture
                ? [
                      {
                          ...picture,
                          key: "picture",
                          size: wide ? 16 : 12,
                          at: { x: wide ? 2 : 6, y: wide ? 3 : 0 },
                      },
                  ]
                : [];
            parts.push({
                key: "slots",
                art: "soundboxes",
                z: 1,
                at: slot(0),
                params: { boxes: boxCount, filled: [], counters: false },
            });
            sounds.forEach((sound, i) => parts.push(tile(`sound:${i}`, sound, home(i))));
            filled(pos).forEach((sound, i) => parts.push(tile(`filled:${i}`, sound, slot(i))));
            return {
                parts,
                size: { w: width(), h: wide ? 24 : 19 + Math.ceil(sounds.length / 5) * 5 },
            };
        },
        handles(pos) {
            if (pos.won) return [];
            const now = filled(pos);
            const handles: Handle[] = [];
            sounds.forEach((sound, i) => {
                if (now.length >= boxCount) return;
                const targets = Array.from({ length: now.length + 1 }, (_, index) => ({
                    id: `slot:${index}`,
                    shape: { x: slot(index).x, y: slot(index).y + 1, w: 3.5, h: 4 },
                    carries: spellSequence(pos, [
                        ...now.slice(0, index),
                        sound,
                        ...now.slice(index),
                    ]),
                }));
                handles.push({
                    key: `sound:${i}`,
                    home: home(i),
                    mode: "free",
                    targets,
                    tap: spellSequence(pos, [...now, sound]),
                });
            });
            now.forEach((sound, i) => {
                const remaining = now.filter((_, index) => index !== i);
                const targets = Array.from({ length: now.length }, (_, index) => ({
                    id: `slot:${index}`,
                    shape: { x: slot(index).x, y: slot(index).y + 1, w: 3.5, h: 4 },
                    carries:
                        index === i
                            ? { moves: [] }
                            : spellSequence(pos, [
                                  ...remaining.slice(0, index),
                                  sound,
                                  ...remaining.slice(index),
                              ]),
                }));
                targets.push({
                    id: "tray",
                    shape: { x: wide ? 25 : 0, y: wide ? 11 : 18, w: 24, h: 12 },
                    carries: spellSequence(pos, remaining),
                });
                handles.push({
                    key: `filled:${i}`,
                    home: slot(i),
                    mode: "free",
                    targets,
                    tap: spellSequence(pos, remaining),
                });
            });
            return handles;
        },
        after(pos) {
            for (const h of this.handles(pos)) ctx.stage.tag(h.key, "grab", true);
        },
    };
}

// The creature each child in a family is drawn with, which two children never share while there are
// creatures enough (.docs/auth.md, "What identifies a kid"): the creatures, each with the loader's
// name for its drawing and the numbers it is drawn with, and the rule, where a test can reach it.

/**
 * The creatures a child's picture is chosen from, each a drawing on the shelf that a five-year-old
 * can name and that is told apart from the others without its colour, in the order a family's
 * children take them. Each is drawn as the worlds draw it: `from`, `ref` and `params` are its line
 * in school/worlds/art.ts, which __tests__/pictures.test.ts holds them to. `from` is here because
 * the loader keys a hand-drawn file apart from a coded drawing (`artKey` in engine/space.ts), so a
 * ref alone does not name a drawing.
 */
export const PICTURES: readonly {
    id: string;
    from: "shelf" | "file";
    ref: string;
    params?: Record<string, unknown>;
}[] = [
    { id: "hedgehog", from: "file", ref: "hedgehog" },
    { id: "owl", from: "file", ref: "owl" },
    { id: "fox", from: "shelf", ref: "fox", params: { facing: 1 } },
    { id: "rabbit", from: "shelf", ref: "rabbits", params: { count: 1, facing: 1 } },
    { id: "hen", from: "file", ref: "hen" },
    { id: "duck", from: "file", ref: "duck" },
    { id: "cat", from: "file", ref: "cat" },
    { id: "dog", from: "shelf", ref: "dog", params: { facing: 1, ball: 1 } },
    {
        id: "snail",
        from: "shelf",
        ref: "minibeasts",
        params: { kinds: ["snail"], spots: 0, legs: false },
    },
    { id: "parrot", from: "shelf", ref: "parrot", params: { facing: 1 } },
    { id: "robin", from: "shelf", ref: "robin", params: { post: 0, facing: 1 } },
    { id: "badger", from: "shelf", ref: "badger", params: { facing: -1, count: 1 } },
];

/** A creature by its id, or undefined for a picture that is none of them. */
export const pictureOf = (id: string): (typeof PICTURES)[number] | undefined =>
    PICTURES.find((p) => p.id === id);

/** The picture a child's settings name, or null. */
const named = (settings: unknown): string | null =>
    typeof settings === "object" &&
    settings !== null &&
    "picture" in settings &&
    typeof settings.picture === "string"
        ? settings.picture
        : null;

/**
 * Each child's creature, by id. A picture a child's settings name is theirs when the shelf can draw it
 * and no brother or sister in front of them named it too; every other child takes the first creature
 * nobody has, in the family's order. Past as many children as creatures, the creatures repeat.
 */
export function picturesOf(
    kids: readonly { id: string; settings: unknown }[],
    creatures: readonly string[],
    drawable: (id: string) => boolean,
): Map<string, string> {
    const out = new Map<string, string>();
    const taken = new Set<string>();
    for (const kid of kids) {
        const picture = named(kid.settings);
        if (picture !== null && drawable(picture) && !taken.has(picture)) {
            out.set(kid.id, picture);
            taken.add(picture);
        }
    }
    let again = 0;
    for (const kid of kids) {
        if (out.has(kid.id)) continue;
        const picture =
            creatures.find((c) => !taken.has(c)) ?? creatures[again++ % creatures.length];
        if (picture === undefined) continue;
        out.set(kid.id, picture);
        taken.add(picture);
    }
    return out;
}

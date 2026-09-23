/** Login names are separate from the name printed on a child's work. */
export const usernameOf = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const name = value.trim().toLowerCase();
    return /^[a-z][a-z0-9-]{2,31}$/.test(name) ? name : null;
};

const clues = [
    "acorn",
    "badger",
    "beacon",
    "comet",
    "dolphin",
    "fern",
    "fox",
    "lighthouse",
    "otter",
    "penguin",
    "rocket",
    "sunbeam",
    "tiger",
    "willow",
];

export const USERNAME_WORD_COUNT = clues.length;

export function suggestedUsername(name: string, startAt: number, attempt = 0): string {
    const stem = name
        .normalize("NFKD")
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase()
        .slice(0, 12);
    const base = stem || "learner";
    if (attempt === 0 && base.length >= 3) return base;
    const offset = Math.max(0, attempt - (base.length < 3 ? 0 : 1));
    const clue = clues[(startAt + offset) % clues.length] ?? "star";
    const round = Math.floor(offset / clues.length);
    return `${base}-${clue}${round ? `-${round + 1}` : ""}`;
}

/** The ordinary mailbox addresses supported by email sign-in; delivery proves ownership.
 * Keep dots and plus tags intact: they can distinguish different mailboxes.
 */
export function emailOf(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const email = value.trim().toLowerCase();
    if (email.length > 254) return null;
    const parts = email.split("@");
    if (parts.length !== 2) return null;
    const [local, domain] = parts;
    if (!local || !domain || local.length > 64) return null;
    if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local))
        return null;
    const labels = domain.split(".");
    if (
        labels.length < 2 ||
        labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    )
        return null;
    return email;
}

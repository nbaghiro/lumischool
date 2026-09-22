/** Login names are separate from the name printed on a child's work. */
export const usernameOf = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const name = value.trim().toLowerCase();
    return /^[a-z][a-z0-9-]{2,31}$/.test(name) ? name : null;
};

export function suggestedUsername(name: string, suffix: string): string {
    const stem = name
        .normalize("NFKD")
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase()
        .slice(0, 12);
    return `${stem || "learner"}-${suffix}`;
}

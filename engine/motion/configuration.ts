/** Stable object-key ordering makes a layout's identity independent of wire serialization. */
export function configurationKey(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
    if (Array.isArray(value)) return `[${value.map(configurationKey).join(",")}]`;
    return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${configurationKey(item)}`)
        .join(",")}}`;
}

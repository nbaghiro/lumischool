/** Cached bodies are separate from in-flight work and from the state held by their readers. */
export function reads<T>(
    cost: (value: T) => number,
    limit = 24,
    budget = 2_000_000,
): {
    read(key: string, load: () => Promise<T | null>): Promise<T | null>;
    size(): number;
} {
    const held = new Map<string, { value: T; cost: number }>();
    const pending = new Map<string, Promise<T | null>>();
    let used = 0;
    return {
        read(key, load) {
            const cached = held.get(key);
            if (cached) {
                held.delete(key);
                held.set(key, cached);
                return Promise.resolve(cached.value);
            }
            const running = pending.get(key);
            if (running) return running;
            const result = Promise.resolve()
                .then(load)
                .then((value) => {
                    if (value === null) return null;
                    const weight = cost(value);
                    // A large foreground body is still delivered; it must not monopolise the cache.
                    if (weight <= budget) {
                        held.set(key, { value, cost: weight });
                        used += weight;
                        for (const [id, item] of held) {
                            if (held.size <= limit && used <= budget) break;
                            held.delete(id);
                            used -= item.cost;
                        }
                    }
                    return value;
                })
                .finally(() => pending.delete(key));
            pending.set(key, result);
            return result;
        },
        size: () => held.size,
    };
}

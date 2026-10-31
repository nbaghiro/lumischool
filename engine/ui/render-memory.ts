import { smallDevice } from "./device";

/** Cached GPU pixels share a document limit; current presentation is never evicted for a request. */
export function resourceBudget(limit: number) {
    let bytes = 0;
    let highWater = 0;
    const owners = new Map<
        object,
        { bytes: number; presentation: number; parked: boolean; reclaim: () => void }
    >();
    return {
        owner(reclaim: () => void) {
            const id = {};
            const owner = { bytes: 0, presentation: 0, parked: false, reclaim };
            owners.set(id, owner);
            const reservations = new Set<() => void>();
            let stopped = false;
            return {
                park(parked: boolean) {
                    owner.parked = parked;
                },
                measure(presentation: number) {
                    owner.presentation = presentation;
                },
                reserve(weight: number): (() => void) | null {
                    if (stopped || !Number.isFinite(weight) || weight <= 0 || weight > limit)
                        return null;
                    if (bytes + weight > limit) {
                        for (const candidate of owners.values()) {
                            candidate.reclaim();
                            if (bytes + weight <= limit) break;
                        }
                    }
                    if (bytes + weight > limit) return null;
                    bytes += weight;
                    owner.bytes += weight;
                    highWater = Math.max(highWater, bytes);
                    let released = false;
                    const release = () => {
                        if (released) return;
                        released = true;
                        bytes -= weight;
                        owner.bytes -= weight;
                        reservations.delete(release);
                    };
                    reservations.add(release);
                    return release;
                },
                stop() {
                    stopped = true;
                    for (const release of reservations) release();
                    owners.delete(id);
                },
            };
        },
        stats: () => ({
            bytes,
            presentation: [...owners.values()].reduce((sum, owner) => sum + owner.presentation, 0),
            highWater,
            limit,
            owners: owners.size,
            active: [...owners.values()].filter((owner) => !owner.parked).length,
            allocations: [...owners.values()].map((owner) => owner.bytes),
        }),
    };
}

export const mapMemory = resourceBudget((smallDevice ? 192 : 384) * 1024 * 1024);

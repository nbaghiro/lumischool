/** Optional scenery shares one frame allowance across every scene in the document. */
export function frameWork(clock: {
    now(): number;
    request(run: () => void): number;
    cancel(id: number): void;
}): { schedule(work: (deadline: number) => void): number; cancel(id: number): void } {
    const waiting = new Map<number, (deadline: number) => void>();
    let serial = 0;
    let frame = 0;
    let running = false;
    const arm = (): void => {
        if (!frame && !running && waiting.size) frame = clock.request(flush);
    };
    const flush = (): void => {
        frame = 0;
        running = true;
        const deadline = clock.now() + 4;
        // Requeued work belongs to the next frame, even if this batch finishes early.
        const batch = [...waiting];
        try {
            for (const [id, work] of batch) {
                if (!waiting.delete(id)) continue;
                work(deadline);
                if (clock.now() >= deadline) break;
            }
        } finally {
            running = false;
            arm();
        }
    };
    return {
        schedule(work) {
            const id = ++serial;
            waiting.set(id, work);
            arm();
            return id;
        },
        cancel(id) {
            waiting.delete(id);
            if (!waiting.size && frame) {
                clock.cancel(frame);
                frame = 0;
            }
        },
    };
}

export const sceneWork = frameWork({
    now: () => performance.now(),
    request: (run) => requestAnimationFrame(run),
    cancel: (id) => cancelAnimationFrame(id),
});

import { isStoredPicture, hasPictureWork, type Picture } from "../painting";

export interface PaintingRecovery {
    document: Picture;
    revision: number;
    operation_id: string;
    updated_at: string;
}
export interface PaintingRepository {
    revision: number;
    recovery?: PaintingRecovery;
    save(
        document: Picture,
        thumbnail: string,
        operationId: string,
        revision: number,
    ): Promise<{ document: Picture; revision: number; conflict: boolean }>;
    keep(recovery: PaintingRecovery): Promise<void>;
    forget(id: string, operationId: string): Promise<void>;
}
export function paintingAutosave(options: {
    repository: PaintingRepository;
    initial: Picture;
    thumbnail: (picture: Picture) => Promise<string>;
    status: (text: string) => void;
    identity: (id: string) => void;
    delay?: number;
}) {
    const repository = options.repository;
    let revision = repository.revision;
    let id = options.initial.id;
    let text = JSON.stringify(options.initial);
    let pending: PaintingRecovery | undefined = repository.recovery;
    let active: Promise<void> | undefined;
    let local: Promise<void> = Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let conflict = false;
    let locallySaved = false;
    let invalid = false;
    function persist(item: PaintingRecovery) {
        local = local
            .catch(() => {})
            .then(async () => {
                locallySaved = false;
                await repository.keep(item);
                locallySaved = true;
            });
        return local;
    }
    function change(document: Picture) {
        const next = { ...structuredClone(document), id };
        const nextText = JSON.stringify(next);
        if (nextText === text || (!revision && !hasPictureWork(next))) return;
        invalid = !isStoredPicture(next);
        if (invalid) {
            options.status("This picture is too large to sync. Download a copy.");
            return;
        }
        text = nextText;
        pending = {
            document: next,
            revision,
            operation_id: crypto.randomUUID(),
            updated_at: new Date().toISOString(),
        };
        options.status("Saving…");
        void persist(pending).catch(() =>
            options.status("Device recovery unavailable. Keep this page open until saved."),
        );
        clearTimeout(timer);
        timer = setTimeout(() => {
            void flush();
        }, options.delay ?? 700);
    }
    async function send() {
        while (pending) {
            const item = pending;
            try {
                await local.catch(() => {});
                const thumbnail = await options.thumbnail(item.document);
                const result = await repository.save(
                    item.document,
                    thumbnail,
                    item.operation_id,
                    item.revision,
                );
                revision = result.revision;
                id = result.document.id;
                conflict ||= result.conflict;
                options.identity(id);
                if (pending === item) {
                    pending = undefined;
                    text = JSON.stringify(result.document);
                    await repository.forget(item.document.id, item.operation_id);
                } else if (pending) {
                    const previous = pending;
                    pending = { ...pending, document: { ...pending.document, id }, revision };
                    text = JSON.stringify(pending.document);
                    await persist(pending);
                    if (previous.document.id !== id)
                        await repository.forget(previous.document.id, previous.operation_id);
                    await repository.forget(item.document.id, item.operation_id);
                }
                if (invalid) return;
                options.status(
                    pending
                        ? "Saving…"
                        : conflict
                          ? "Saved as a separate copy. Both versions are safe."
                          : "Saved",
                );
            } catch {
                options.status(
                    locallySaved || repository.recovery
                        ? "Saved on this device · waiting to sync"
                        : "Not saved. Keep this page open or download a copy.",
                );
                return;
            }
        }
    }
    function flush(): Promise<void> {
        clearTimeout(timer);
        if (!active)
            active = send().finally(() => {
                active = undefined;
            });
        return active;
    }
    return {
        change,
        flush,
        async leave() {
            clearTimeout(timer);
            await local.catch(() => {});
            if (invalid) return false;
            if (locallySaved) {
                void flush();
                return true;
            }
            await flush();
            return !pending;
        },
    };
}

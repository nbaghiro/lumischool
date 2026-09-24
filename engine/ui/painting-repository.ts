import { isStoredPicture, type Picture } from "../painting";
import type { PaintingScope } from "../../server/api";
import * as api from "./api";
import type { PaintingRecovery, PaintingRepository } from "./painting-save";
export type { PaintingRecovery, PaintingRepository } from "./painting-save";

export interface PaintingGateway {
    list: typeof api.paintingList;
    load: typeof api.paintingLoad;
    save: typeof api.paintingSave;
    remove: typeof api.paintingDelete;
}
export const parentPaintingGateway: PaintingGateway = {
    list: api.paintingList,
    load: api.paintingLoad,
    save: api.paintingSave,
    remove: api.paintingDelete,
};

const DB = "lumischool-painting-recovery";
function database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore("pending");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
function prefix(identityKey: string, scope: PaintingScope): string {
    return `${identityKey}:${scope.kid_id ?? "parent"}:`;
}
async function transaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
    const db = await database();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction("pending", mode);
        let result: T;
        action(tx.objectStore("pending"), (value) => {
            result = value;
        });
        tx.oncomplete = () => {
            db.close();
            resolve(result);
        };
        tx.onerror = tx.onabort = () => {
            db.close();
            reject(tx.error);
        };
    });
}
export async function loadPaintingRecovery(
    identityKey: string,
    scope: PaintingScope,
): Promise<PaintingRecovery[]> {
    const start = prefix(identityKey, scope);
    return transaction("readonly", (store, done) => {
        const request = store.getAll(IDBKeyRange.bound(start, `${start}\uffff`));
        request.onsuccess = () => {
            const values: unknown[] = request.result;
            done(
                values.filter((value): value is PaintingRecovery => {
                    if (
                        !value ||
                        typeof value !== "object" ||
                        !("document" in value) ||
                        !("revision" in value) ||
                        !("operation_id" in value) ||
                        !("updated_at" in value)
                    )
                        return false;
                    return (
                        isStoredPicture(value.document) &&
                        typeof value.revision === "number" &&
                        typeof value.operation_id === "string" &&
                        typeof value.updated_at === "string"
                    );
                }),
            );
        };
    });
}
export function makePaintingRepository(
    scope: PaintingScope,
    identityKey: string,
    revision = 0,
    recovery?: PaintingRecovery,
    gateway: PaintingGateway = parentPaintingGateway,
): PaintingRepository {
    const start = prefix(identityKey, scope);
    const writer = crypto.randomUUID();
    return {
        revision,
        recovery,
        async save(
            document: Picture,
            thumbnail: string,
            operationId: string,
            expectedRevision: number,
        ) {
            const result = await gateway.save({
                scope,
                document,
                thumbnail,
                operation_id: operationId,
                expected_revision: expectedRevision,
            });
            if ("error" in result) throw new Error(result.error);
            return {
                document: result.document,
                revision: result.artwork.revision,
                conflict: result.conflict,
            };
        },
        async keep(recovery) {
            await transaction<void>("readwrite", (store, done) => {
                const key = `${start}${recovery.document.id}:${writer}`;
                const count = store.count();
                count.onsuccess = () => {
                    const existing = store.getKey(key);
                    existing.onsuccess = () => {
                        if (count.result >= 100 && existing.result === undefined) {
                            store.transaction.abort();
                            return;
                        }
                        store.put(recovery, key);
                        done();
                    };
                };
            });
        },
        async forget(id, operationId) {
            await transaction<void>("readwrite", (store, done) => {
                const request = store.openCursor(
                    IDBKeyRange.bound(`${start}${id}:`, `${start}${id}:\uffff`),
                );
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) {
                        done();
                        return;
                    }
                    const value: unknown = cursor.value;
                    if (
                        value &&
                        typeof value === "object" &&
                        "operation_id" in value &&
                        value.operation_id === operationId
                    )
                        cursor.delete();
                    cursor.continue();
                };
            });
            window.dispatchEvent(new Event("painting-saved"));
        },
    };
}

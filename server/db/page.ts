// A page of a query, cut by its key columns rather than by an offset (.docs/pagination.md), inside the
// transaction withFamily opened, so row-level security narrows the rows before any page is cut.

import { and, asc, desc, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cursorOf, type Key, type Page } from "../../engine/page";
import type { FamilyTx } from "./client";

/** A list's order: key columns, most significant first, that are unique together, all one way. */
export interface Order<Row> {
    columns: readonly [AnyColumn, ...AnyColumn[]];
    direction: "asc" | "desc";
    keyOf: (row: Row) => Key;
}

/** What a query is given to cut one page: its narrowing, the order, and one row past the page. */
export interface Cut {
    where: SQL | undefined;
    orderBy: SQL[];
    limit: number;
}

/**
 * One page of `read`, which selects the list's rows `where` it is told, in the order, to the limit.
 * `match` is what narrows the list beyond its own conditions, such as a search, and applies to the whole
 * list before the page is cut. The first page also counts every match when `count` is given.
 */
export async function pageOf<Row>(
    tx: FamilyTx,
    order: Order<Row>,
    at: { after: Key | null; limit: number; query: string; match?: SQL | undefined },
    read: (tx: FamilyTx, cut: Cut) => Promise<Row[]>,
    count?: (tx: FamilyTx, where: SQL | undefined) => Promise<number>,
): Promise<Page<Row>> {
    if (at.after !== null && at.after.length !== order.columns.length)
        throw new Error("pageOf: the key does not have one value per key column");
    const keys = sql.join([...order.columns], sql`, `);
    const past =
        at.after === null
            ? undefined
            : sql`(${keys}) ${order.direction === "asc" ? sql`>` : sql`<`} (${sql.join(
                  at.after.map((v) => sql`${v}`),
                  sql`, `,
              )})`;
    const by = order.direction === "asc" ? asc : desc;
    const rows = await read(tx, {
        where: and(at.match, past),
        orderBy: order.columns.map((c) => by(c)),
        limit: at.limit + 1,
    });
    const items = rows.slice(0, at.limit);
    const last = items.at(-1);
    const page: Page<Row> = {
        items,
        next:
            rows.length > at.limit && last !== undefined
                ? cursorOf(order.keyOf(last), at.query)
                : null,
    };
    if (at.after === null && count) page.total = await count(tx, at.match);
    return page;
}

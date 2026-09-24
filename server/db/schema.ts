// The seven tables, with no column the code or the database can derive. .docs/db.md gives the
// reasons for the rules that hold them up: Postgres never reads inside `events.data`; nothing derived
// is stored, not even as a view; every foreign key that names a kid names its family too, so deleting
// is one statement and no row can attach to another family's kid; and every table has row-level
// security forced, with policies generated from server/db/scope.ts. No column is called `user`, which
// unquoted means the connected role.

import { sql } from "drizzle-orm";
import {
    bigint,
    check,
    date,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    unique,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import type { Picture } from "../../engine/painting";
import type { AnyEventData, ContentKind, EventKind } from "../../engine/answer";

/**
 * Timestamps are text, ISO 8601 in UTC to the millisecond, so Postgres, the wire and a browser's queue
 * all hold the same string and text order is time order. A timestamptz reaches devices rendered
 * differently from the rows they write themselves.
 */
const instant = (column: string) =>
    sql.raw(`${column} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'`);

/** `time_zone` is stored because a family's records are days, and a day only exists in one zone. */
export const families = pgTable("families", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    time_zone: text("time_zone").notNull(),
}).enableRLS();
export type Family = typeof families.$inferSelect;

/** No family column, since one person may belong to several families through `members`. */
export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: text("email").notNull(),
        name: text("name"),
        /** What a grown-up chose for themselves, as a kid's `settings` holds a child's: their picture, by the shelf's name for it. */
        settings: jsonb("settings")
            .notNull()
            .default(sql`'{}'::jsonb`),
        passkeys: jsonb("passkeys")
            .notNull()
            .default(sql`'[]'::jsonb`),
    },
    (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
).enableRLS();
export type User = typeof users.$inferSelect;

/**
 * Nothing that identifies or reaches a child, and no soft delete (.docs/db.md). `unique (family_id,
 * id)` is what lets other tables name a kid as `(family_id, kid_id)` in a foreign key.
 */
export const kids = pgTable(
    "kids",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        grade: integer("grade").notNull(),
        settings: jsonb("settings")
            .notNull()
            .default(sql`'{}'::jsonb`),
    },
    (t) => [
        unique("kids_family_id_id_key").on(t.family_id, t.id),
        uniqueIndex("kids_username_key").on(sql`lower(${t.settings}->>'username')`),
    ],
).enableRLS();
export type Kid = typeof kids.$inferSelect;

/**
 * No role column: a membership with no kid is a parent, and one with a kid and a window is a tutor.
 * A removed member keeps the row, with `ended_at`, so their name stays in the history, and it grants
 * nothing. Two triggers in the migration keep at least one active parent in every family.
 */
export const members = pgTable(
    "members",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        kid_id: uuid("kid_id"),
        from_day: date("from_day"),
        to_day: date("to_day"),
        ended_at: text("ended_at"),
    },
    (t) => [
        foreignKey({
            name: "members_family_kid_fk",
            columns: [t.family_id, t.kid_id],
            foreignColumns: [kids.family_id, kids.id],
        }).onDelete("cascade"),
        check(
            "members_parent_or_tutor",
            sql`(${t.kid_id} is null and ${t.from_day} is null and ${t.to_day} is null)
             or (${t.kid_id} is not null and ${t.from_day} is not null and ${t.to_day} is not null and ${t.from_day} <= ${t.to_day})`,
        ),
        check(
            "members_ended_at_is_an_instant",
            sql`${t.ended_at} is null or ${instant("ended_at")}`,
        ),
        // One parent row per person per family, and one tutor row per person per kid.
        uniqueIndex("members_parent_key")
            .on(t.user_id, t.family_id)
            .where(sql`kid_id is null`),
        uniqueIndex("members_tutor_key")
            .on(t.user_id, t.family_id, t.kid_id)
            .where(sql`kid_id is not null`),
        index("members_family_idx").on(t.family_id),
    ],
).enableRLS();
export type Member = typeof members.$inferSelect;

/**
 * Sessions, children's views, a family's PIN and codes in one table, because each is found by a hash,
 * expires by a rule and is counted by the rate limits. How each kind is reached is in server/db/keys.ts.
 * A children's view holds one key per child, so `kid_id` is a single column. A used code is deleted; the event it
 * produced is the record.
 */
export const keys = pgTable(
    "keys",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        family_id: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
        kind: text("kind").notNull(),
        hash: text("hash").notNull(),
        user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
        kid_id: uuid("kid_id"),
        email: text("email"),
        name: text("name"),
        detail: jsonb("detail")
            .notNull()
            .default(sql`'{}'::jsonb`),
        attempts: integer("attempts").notNull().default(0),
        ip: text("ip"),
        seen_at: text("seen_at"),
        created_at: text("created_at")
            .notNull()
            .default(sql`utc_iso(now())`),
    },
    (t) => [
        foreignKey({
            name: "keys_family_kid_fk",
            columns: [t.family_id, t.kid_id],
            foreignColumns: [kids.family_id, kids.id],
        }).onDelete("cascade"),
        unique("keys_hash_key").on(t.hash),
        // Anonymous browser bindings survive family deletion to protect other families’ sessions.
        check(
            "keys_family_null_only_before_a_family",
            sql`${t.family_id} is not null or ${t.kind} in ('sign-in', 'confirm', 'kid-attempt') or (${t.kind} = 'browser' and ${t.user_id} is null and ${t.kid_id} is null and ${t.email} is null and ${t.detail}->>'originFamily' is not null)`,
        ),
        check(
            "keys_session_names_a_user",
            sql`${t.kind} not in ('session', 'shared-session') or (${t.user_id} is not null and ${t.kid_id} is null)`,
        ),
        // A children's view has a key per child, naming the child and the parent who opened it, and a
        // family's PIN names no child.
        check(
            "keys_kid_session_names_a_kid_and_a_parent",
            sql`${t.kind} <> 'kid-session' or (${t.kid_id} is not null and ${t.user_id} is not null)`,
        ),
        check("keys_pin_names_no_kid", sql`${t.kind} <> 'pin' or ${t.kid_id} is null`),
        uniqueIndex("keys_kid_pin_key")
            .on(t.family_id)
            .where(sql`kind = 'kid-pin'`),
        // One PIN per family: setting it again replaces the row.
        uniqueIndex("keys_pin_key")
            .on(t.family_id)
            .where(sql`kind = 'pin'`),
        check("keys_created_at_is_an_instant", instant("created_at")),
        check("keys_seen_at_is_an_instant", sql`${t.seen_at} is null or ${instant("seen_at")}`),
        index("keys_family_idx").on(t.family_id),
        // What the rate limits count: codes per address and per network in a window.
        index("keys_email_idx").on(t.email, t.created_at),
        index("keys_ip_idx").on(t.ip, t.created_at),
    ],
).enableRLS();
export type Key = typeof keys.$inferSelect;

/**
 * Appended and never updated; the app role has insert and select only. The writer's `id` makes a
 * replayed upload write nothing twice, and `(family_id, device, seq)` shows a missing event as a gap.
 * `device` and `actor` have no foreign key, because the log must outlive a revoked key or a deleted
 * account without an append being blocked or a row rewritten.
 */
export const events = pgTable(
    "events",
    {
        id: uuid("id").primaryKey(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        kid_id: uuid("kid_id"),
        // Text and opaque jsonb, so a new event kind is an entry in engine/answer.ts, not a migration.
        kind: text("kind").$type<EventKind>().notNull(),
        data: jsonb("data").$type<AnyEventData>().notNull(),
        actor: uuid("actor"),
        device: uuid("device").notNull(),
        seq: bigint("seq", { mode: "number" }).notNull(),
        at: text("at").notNull(),
    },
    (t) => [
        unique("events_family_device_seq_key").on(t.family_id, t.device, t.seq),
        check("events_at_is_an_instant", instant("at")),
        foreignKey({
            name: "events_family_kid_fk",
            columns: [t.family_id, t.kid_id],
            foreignColumns: [kids.family_id, kids.id],
        }).onDelete("cascade"),
        // The two reads that exist. The fold reads a whole kid's log, so nothing indexes kind or data.
        index("events_family_idx").on(t.family_id, t.at),
        index("events_kid_idx").on(t.kid_id, t.at),
    ],
).enableRLS();
export type Event = typeof events.$inferSelect;

/**
 * `family_id` is null for our catalogue. `hash` is generated from the body so it cannot disagree with
 * it, and `nulls not distinct` makes a catalogue revision unique among catalogue rows. Revisions are
 * immutable: the app role has no update.
 */
export const content = pgTable(
    "content",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        family_id: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
        body: text("body").notNull(),
        hash: text("hash")
            .notNull()
            .generatedAlwaysAs(sql`utf8_sha256(body)`),
        name: text("name").notNull(),
        kind: text("kind").$type<ContentKind | "pack">().notNull(),
    },
    (t) => [
        unique("content_family_hash_key").on(t.family_id, t.hash).nullsNotDistinct(),
        index("content_family_name_idx").on(t.family_id, t.name),
    ],
).enableRLS();
export type Content = typeof content.$inferSelect;

export const mailPreferences = pgTable(
    "mail_preferences",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        mode: text("mode").$type<"off" | "private" | "detailed">().notNull().default("off"),
        changed_at: text("changed_at").notNull(),
    },
    (t) => [
        unique("mail_preferences_recipient_key").on(t.family_id, t.user_id),
        check("mail_preferences_mode", sql`${t.mode} in ('off', 'private', 'detailed')`),
    ],
).enableRLS();
export type MailPreference = typeof mailPreferences.$inferSelect;

export const mailDeliveries = pgTable(
    "mail_deliveries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        week: date("week").notNull(),
        status: text("status")
            .$type<
                "pending" | "sending" | "sent" | "delivered" | "failed" | "suppressed" | "uncertain"
            >()
            .notNull()
            .default("pending"),
        recipient: text("recipient").notNull(),
        mode: text("mode").$type<"private" | "detailed">().notNull(),
        subject: text("subject").notNull(),
        body_text: text("body_text").notNull(),
        body_html: text("body_html").notNull(),
        created_at: text("created_at").notNull(),
        attempted_at: text("attempted_at"),
        lease_until: text("lease_until"),
        provider_id: text("provider_id"),
        attempts: integer("attempts").notNull().default(0),
    },
    (t) => [
        unique("mail_deliveries_week_key").on(t.family_id, t.user_id, t.week),
        index("mail_deliveries_provider_idx").on(t.provider_id),
        check(
            "mail_deliveries_status",
            sql`${t.status} in ('pending', 'sending', 'sent', 'delivered', 'failed', 'suppressed', 'uncertain')`,
        ),
    ],
).enableRLS();
export type MailDelivery = typeof mailDeliveries.$inferSelect;

export const artworks = pgTable(
    "artworks",
    {
        id: uuid("id").primaryKey(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        kid_id: uuid("kid_id"),
        owner_user_id: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        document: jsonb("document").$type<Picture>().notNull(),
        thumbnail: text("thumbnail").notNull(),
        revision: integer("revision").notNull(),
        created_at: text("created_at").notNull(),
        updated_at: text("updated_at").notNull(),
        updated_by: uuid("updated_by")
            .notNull()
            .references(() => users.id),
        deleted_at: text("deleted_at"),
    },
    (t) => [
        unique("artworks_family_id_key").on(t.family_id, t.id),
        foreignKey({
            columns: [t.family_id, t.kid_id],
            foreignColumns: [kids.family_id, kids.id],
        }).onDelete("cascade"),
        check("artworks_owner", sql`(${t.kid_id} is null) <> (${t.owner_user_id} is null)`),
        check("artworks_revision", sql`${t.revision} > 0`),
        index("artworks_gallery_idx").on(t.family_id, t.kid_id, t.owner_user_id, t.updated_at),
    ],
).enableRLS();
export type Artwork = typeof artworks.$inferSelect;
export const paintingSaves = pgTable(
    "painting_saves",
    {
        id: uuid("id").primaryKey(),
        family_id: uuid("family_id")
            .notNull()
            .references(() => families.id, { onDelete: "cascade" }),
        artwork_id: uuid("artwork_id").notNull(),
        request_hash: text("request_hash").notNull(),
        document: jsonb("document").$type<Picture>().notNull(),
        thumbnail: text("thumbnail").notNull(),
        revision: integer("revision").notNull(),
        conflict: integer("conflict").notNull(),
        saved_at: text("saved_at").notNull(),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id),
    },
    (t) => [
        foreignKey({
            columns: [t.family_id, t.artwork_id],
            foreignColumns: [artworks.family_id, artworks.id],
        }).onDelete("cascade"),
    ],
).enableRLS();

export type PaintingReceipt = typeof paintingSaves.$inferSelect;

export const schema = {
    artworks,
    paintingSaves,
    families,
    users,
    kids,
    members,
    keys,
    events,
    content,
    mailPreferences,
    mailDeliveries,
};

/** The table names, in an order a truncate can use. */
export const TABLES = [
    "painting_saves",
    "artworks",
    "mail_deliveries",
    "mail_preferences",
    "events",
    "keys",
    "members",
    "content",
    "kids",
    "users",
    "families",
] as const;

export interface PaintingScope {
    kid_id: string | null;
}
export type ArtworkSummary = Pick<
    Artwork,
    | "id"
    | "kid_id"
    | "owner_user_id"
    | "title"
    | "thumbnail"
    | "revision"
    | "created_at"
    | "updated_at"
    | "updated_by"
>;
export interface PaintingSave {
    scope: PaintingScope;
    document: Picture;
    expected_revision: number;
    operation_id: string;
    thumbnail: string;
}
export interface PaintingLoaded {
    artwork: ArtworkSummary;
    document: Picture;
}
export interface PaintingSaved extends PaintingLoaded {
    conflict: boolean;
}

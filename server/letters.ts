import { createHmac, timingSafeEqual } from "node:crypto";
import { weeklyLetter, validWeek, weekEnding, type WeeklyLetter } from "../school/family/letter";
import { dayIn } from "../school/record/record";
import { consented, type Adult } from "./auth";
import { withFamily } from "./db/client";
import { familyRow, kidsOf, log } from "./db/events";
import * as mail from "./db/mail";
import type { MailPreference } from "./db/schema";
import type { Transport } from "./email";
import { escapeHtml, weeklyMail } from "./mail-design";
import type { Pack } from "./pack";
import { Refused } from "./sync";

export interface LettersConfig {
    origin: string;
    secret: string;
    send: Transport;
    pack: Pack | null;
}

export async function letterFor(
    family: string,
    user: string,
    pack: Pack | null,
    week?: string,
    now = new Date().toISOString(),
): Promise<WeeklyLetter> {
    if (!pack)
        throw new Refused(503, { error: "server", problem: "The lesson pack is not ready." });
    return withFamily({ family, user }, async (tx) => {
        if (!(await mail.recipient(tx, family, user)))
            throw new Refused(403, { error: "not-allowed" });
        const row = await familyRow(tx, family);
        if (!row) throw new Refused(404, { error: "not-found" });
        const to = week ?? weekEnding(now, row.time_zone);
        if (!validWeek(to) || to > weekEnding(now, row.time_zone))
            throw new Refused(400, {
                error: "bad-request",
                problem: "Choose a completed week ending on Sunday.",
            });
        const allowed = await consented(tx, family);
        return weeklyLetter({
            kids: (await kidsOf(tx, family)).filter((k) => allowed.has(k.id)),
            events: await log(tx, { family }),
            lessons: pack.index.lessons,
            zone: row.time_zone,
            to,
            now,
        });
    });
}

export async function letterView(
    adult: Adult,
    pack: Pack | null,
    week?: string,
): Promise<{ letter: WeeklyLetter; mode: MailPreference["mode"] }> {
    const letter = await letterFor(adult.family.id, adult.user, pack, week);
    const mode = await withFamily({ family: adult.family.id, user: adult.user }, (tx) =>
        mail.preference(tx, adult.family.id, adult.user),
    );
    return { letter, mode };
}

export async function changeLetters(adult: Adult, mode: unknown): Promise<void> {
    if (!adult.parent) throw new Refused(403, { error: "not-allowed" });
    if (mode !== "off" && mode !== "private" && mode !== "detailed")
        throw new Refused(400, { error: "bad-request" });
    await withFamily({ family: adult.family.id, user: adult.user }, (tx) =>
        mail.setPreference(tx, adult.family.id, adult.user, mode),
    );
}

const mac = (text: string, secret: string): string =>
    createHmac("sha256", secret).update(text).digest("base64url");
const equal = (a: string, b: string): boolean => {
    const left = Buffer.from(a),
        right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

export function unsubscribeToken(family: string, user: string, secret: string): string {
    const key = `${family}.${user}`;
    return `${key}.${mac(`weekly-unsubscribe:${key}`, secret)}`;
}

export function readUnsubscribe(
    token: string,
    secret: string,
): { family: string; user: string } | null {
    const [family, user] = token.split(".");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!family || !user || !uuid.test(family) || !uuid.test(user)) return null;
    return equal(token, unsubscribeToken(family, user, secret)) ? { family, user } : null;
}

export async function unsubscribeRequest(req: Request, secret: string): Promise<Response> {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const who = readUnsubscribe(token, secret);
    const headers = {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "content-security-policy":
            "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
    };
    if (!who) return new Response("This preferences link is not valid.", { status: 400, headers });
    if (req.method === "POST") {
        await withFamily(who, (tx) => mail.setPreference(tx, who.family, who.user, "off"));
        return new Response("Weekly letters are stopped. Your sign-in emails are unchanged.", {
            headers,
        });
    }
    return new Response(
        `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Weekly letters</title><body style="background:#f4f6f8;color:#22262e;font:18px/1.7 Verdana;padding:40px"><main style="max-width:540px;margin:auto;background:white;padding:32px"><h1>Weekly letters</h1><p>Stop weekly letters for this family. Your sign-in emails will continue.</p><form method="post" action="/api/letters/unsubscribe?token=${escapeHtml(token)}"><button style="padding:16px;background:#2a4bbf;color:white;border:0;font:inherit">Stop weekly letters</button></form></main></body></html>`,
        { headers },
    );
}

export async function deliverLetters(
    config: LettersConfig,
    now = new Date().toISOString(),
): Promise<{ sent: number; uncertain: number }> {
    const recipients = await withFamily({ family: null }, mail.recipients);
    const result = { sent: 0, uncertain: 0 };
    for (const who of recipients) {
        const info = await withFamily(who, async (tx) => ({
            family: await familyRow(tx, who.family),
            email: await mail.recipient(tx, who.family, who.user),
            mode: await mail.preference(tx, who.family, who.user),
        }));
        if (!info.family || !info.email || info.mode === "off") continue;
        const zone = info.family.time_zone;
        const hour = Number(
            new Intl.DateTimeFormat("en-GB", {
                timeZone: zone,
                hour: "2-digit",
                hourCycle: "h23",
            }).format(new Date(now)),
        );
        if (new Date(`${dayIn(now, zone)}T12:00:00Z`).getUTCDay() === 1 && hour < 8) continue;
        const letter = await letterFor(who.family, who.user, config.pack, undefined, now);
        const unsubscribe = `${config.origin}/api/letters/unsubscribe?token=${unsubscribeToken(who.family, who.user, config.secret)}`;
        if (letter.useful) {
            const message = weeklyMail(
                letter,
                config.origin,
                info.mode === "detailed",
                unsubscribe,
            );
            await withFamily(who, (tx) =>
                mail.queueMail(tx, {
                    family_id: who.family,
                    user_id: who.user,
                    week: letter.to,
                    recipient: info.email ?? "",
                    mode: info.mode === "detailed" ? "detailed" : "private",
                    subject: message.subject,
                    body_text: message.text,
                    body_html: message.html,
                    created_at: now,
                }),
            );
        }
        const claim = await withFamily(who, async (tx) => {
            await mail.pruneMail(tx, now);
            return mail.claimMail(tx, who.family, who.user, now);
        });
        if (!claim) continue;
        try {
            const id = await config.send(
                {
                    to: claim.recipient,
                    subject: claim.subject,
                    text: claim.body_text,
                    html: claim.body_html,
                },
                {
                    key: `weekly/${claim.id}`,
                    headers: {
                        "List-Unsubscribe": `<${unsubscribe}>`,
                        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                    },
                },
            );
            await withFamily(who, (tx) =>
                mail.finishMail(tx, claim.id, "sent", typeof id === "string" ? id : undefined),
            );
            result.sent++;
        } catch {
            // A timeout can happen after acceptance. Reuse this payload and key until its retry window ends.
            result.uncertain++;
        }
    }
    return result;
}

export function verifiedWebhook(
    raw: string,
    headers: Headers,
    secret: string,
    now = Date.now(),
): boolean {
    const id = headers.get("svix-id"),
        timestamp = headers.get("svix-timestamp"),
        signature = headers.get("svix-signature");
    if (
        !id ||
        !timestamp ||
        !signature ||
        !/^\d+$/.test(timestamp) ||
        Math.abs(now / 1000 - Number(timestamp)) > 300
    )
        return false;
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest("base64");
    return signature
        .split(" ")
        .some((part) => part.startsWith("v1,") && equal(part.slice(3), expected));
}

export async function webhookRequest(req: Request, secret: string): Promise<Response> {
    const raw = await req.text();
    if (raw.length > 1048576) return new Response(null, { status: 413 });
    if (!verifiedWebhook(raw, req.headers, secret)) return new Response(null, { status: 401 });
    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return new Response(null, { status: 400 });
    }
    if (
        !body ||
        typeof body !== "object" ||
        !("type" in body) ||
        !("data" in body) ||
        !body.data ||
        typeof body.data !== "object" ||
        !("email_id" in body.data) ||
        typeof body.data.email_id !== "string"
    )
        return new Response(null, { status: 400 });
    const tags = "tags" in body.data ? body.data.tags : null;
    if (!tags || typeof tags !== "object" || !("category" in tags) || tags.category !== "weekly")
        return new Response(null, { status: 204 });
    const status =
        body.type === "email.delivered"
            ? "delivered"
            : body.type === "email.bounced" ||
                body.type === "email.complained" ||
                body.type === "email.suppressed"
              ? "suppressed"
              : body.type === "email.failed"
                ? "failed"
                : null;
    if (!status) return new Response(null, { status: 204 });
    const id = body.data.email_id;
    const family = await withFamily({ family: null }, (tx) => mail.providerFamily(tx, id));
    if (!family) return new Response(null, { status: 503 });
    await withFamily({ family }, (tx) => mail.deliveryEvent(tx, id, status));
    return new Response(null, { status: 204 });
}

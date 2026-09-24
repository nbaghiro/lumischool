import type { WeeklyLetter } from "../school/family/letter";

export const escapeHtml = (s: string): string =>
    s.replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
    );

export interface MailContent {
    subject: string;
    text: string;
    html: string;
}

interface Section {
    heading: string;
    text: string;
}

export const MAIL_WORLDS = [
    "harbour",
    "meadow",
    "kitchen",
    "railway",
    "open-sea",
    "woods",
] as const;

export const mailCover = (world: (typeof MAIL_WORLDS)[number]): string =>
    world === "harbour" ? "/email-world.png" : `/email-world-${world}.png`;

function frame(o: {
    title: string;
    preheader: string;
    sections: Section[];
    origin: string;
    action?: { label: string; path: string };
    code?: string;
    footer?: string;
    unsubscribe?: string;
    date?: string;
    cover: number;
}): MailContent {
    const esc = escapeHtml;
    const origin = new URL(o.origin).origin;
    const cover = mailCover(MAIL_WORLDS[o.cover % MAIL_WORLDS.length] ?? "harbour");
    const url = o.action ? new URL(o.action.path, origin).href : null;
    const text = [
        o.title,
        ...o.sections.flatMap((s) => [s.heading, s.text]),
        ...(o.code ? [o.code] : []),
        ...(url && o.action ? [`${o.action.label}: ${url}`] : []),
        o.footer ?? "A little room to learn. lumischool.",
        ...(o.unsubscribe ? [`Stop weekly letters: ${o.unsubscribe}`] : []),
    ].join("\n\n");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(o.title)}</title></head><body style="margin:0;padding:0;background:#f4f6f8;color:#22262e"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(o.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce3ea;border-radius:8px"><tr><td style="padding:28px 32px 20px;border-bottom:1px solid #c9d9e8"><img src="${esc(origin)}/icon-192.png" width="44" height="44" alt="" style="display:block;margin-bottom:12px"><span style="font:700 24px Georgia,serif;color:#2a4bbf">lumischool</span><p style="font:12px Verdana,sans-serif;letter-spacing:2px;color:#5b6270;margin:8px 0 0">A LITTLE ROOM TO LEARN</p></td></tr><tr><td><img src="${esc(origin)}${cover}" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr><tr><td style="padding:30px 32px">${o.date ? `<p style="font:12px/1.6 Verdana,sans-serif;letter-spacing:1px;color:#5b6270;margin:0 0 12px">${esc(o.date)}</p>` : ""}<h1 style="font:normal 30px/1.25 Georgia,serif;margin:0 0 24px;color:#22262e">${esc(o.title)}</h1>${o.code ? `<p style="font:700 32px/1.5 monospace;letter-spacing:4px;padding:16px;background:#fff4bb;text-align:center;border-radius:4px">${esc(o.code)}</p>` : ""}${o.sections.map((s) => `<h2 style="font:700 16px/1.5 Verdana,sans-serif;margin:24px 0 8px;color:#2a4bbf">${esc(s.heading)}</h2><p style="font:16px/1.75 Verdana,sans-serif;margin:0 0 16px">${esc(s.text)}</p>`).join("")}${url && o.action ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td bgcolor="#2a4bbf" style="border-radius:4px"><a href="${esc(url)}" style="display:inline-block;padding:16px 24px;color:#fff;font:700 15px Verdana,sans-serif;text-decoration:none">${esc(o.action.label)}</a></td></tr></table>` : ""}</td></tr><tr><td style="padding:24px 32px;background:#fafbfc;border-top:1px solid #dce3ea;font:12px/1.75 Verdana,sans-serif;color:#5b6270">${esc(o.footer ?? "Made with care, from lumischool.")}${o.unsubscribe ? `<br><a href="${esc(o.unsubscribe)}" style="color:#2a4bbf">Stop weekly letters</a> · <a href="${esc(origin)}/account#weekly-email" style="color:#2a4bbf">Email preferences</a>` : ""}</td></tr></table></td></tr></table></body></html>`;
    return { subject: o.title, text, html };
}

export function signInMail(
    code: string,
    origin: string,
    purpose: "sign-in" | "email-change" = "sign-in",
): MailContent {
    return frame({
        title:
            purpose === "email-change"
                ? "Confirm your new email address"
                : "Your lumischool sign-in code",
        preheader: "Your code works once, for ten minutes.",
        origin,
        code,
        cover: Math.floor(Date.now() / 86400000),
        sections: [
            {
                heading: purpose === "email-change" ? "Your new sign-in address" : "Welcome back",
                text:
                    purpose === "email-change"
                        ? "Type this code on your Account page to confirm your new email address. It works for ten minutes, once."
                        : "Type this code on the page where you asked to sign in. It works for ten minutes, once.",
            },
            {
                heading: "Did not ask for a code?",
                text: "You can ignore this email. Nobody can sign in without the code.",
            },
        ],
    });
}

export const NOTICE_MAIL = {
    invitation: [
        "You are invited to lumischool",
        "An invitation",
        "A parent has invited you to their family on lumischool. Sign in with this email address to review your invitation.",
    ],
    joined: [
        "Your family access has changed",
        "Someone joined",
        "A grown-up has joined your family. Open your account to review who has access.",
    ],
    removed: [
        "Your family access has changed",
        "Access ended",
        "A family membership has ended. Open your account to review your current access.",
    ],
    tutor: [
        "Your teaching access has changed",
        "Your teaching window",
        "Your access to a family's lessons has changed. Sign in to see your current teaching window.",
    ],
    consent: [
        "Your lumischool consent receipt",
        "Your choices are recorded",
        "You can review your consent, export your family's records, or withdraw consent from your account.",
    ],
    security: [
        "A change to your lumischool account",
        "Please review your account",
        "A sign-in or account setting has changed. If you did not make this change, open your account and review your active sessions.",
    ],
    closed: [
        "Your lumischool family is closed",
        "Your family account",
        "Your family has been closed. Its members no longer have access to it.",
    ],
    inactivity: [
        "A note about your lumischool family",
        "It has been a while",
        "Open your account to review your family's records and account options.",
    ],
} as const;

export function noticeMail(kind: keyof typeof NOTICE_MAIL, origin: string): MailContent {
    const [title, heading, text] = NOTICE_MAIL[kind];
    return frame({
        title,
        preheader: text,
        origin,
        cover: Object.keys(NOTICE_MAIL).indexOf(kind) + 1,
        sections: [{ heading, text }],
        action: { label: "Open your account", path: "/account" },
    });
}

export function weeklyMail(
    letter: WeeklyLetter,
    origin: string,
    detailed: boolean,
    unsubscribe: string,
): MailContent {
    const date = (day: string): string =>
        new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
        });
    return {
        ...frame({
            title: "Your week at lumischool",
            date: `${date(letter.from)} to ${date(letter.to)}`,
            preheader: detailed
                ? "What happened, what needs a little help, and what comes next."
                : "A reminder to review your family’s week.",
            origin,
            cover: Math.floor(Date.parse(`${letter.to}T12:00:00Z`) / (7 * 86400000)),
            sections: detailed
                ? letter.children.flatMap((child) => [
                      {
                          heading: `A letter for ${child.name}'s grown-ups`,
                          text: "From the paper bird, with a look at the week.",
                      },
                      ...child.sections,
                  ])
                : [
                      {
                          heading: "A moment to review your week",
                          text: "Open your family’s page to review recorded work and anything waiting for your attention. Visit Calendar to plan the days ahead.",
                      },
                  ],
            action: { label: "Open your family’s page", path: "/" },
            unsubscribe,
            footer: `Assembled from recorded work through ${date(letter.to)}. Later changes may appear in the app. You receive this because you enabled weekly letters.`,
        }),
        subject: `Your week at lumischool · ${date(letter.to)}`,
    };
}

export function invitationMail(
    origin: string,
    token: string,
    family: string,
    inviter: string,
): MailContent {
    return frame({
        title: "A place in the family",
        preheader: `${inviter} invited you to join ${family} on lumischool.`,
        origin,
        cover: 0,
        sections: [
            {
                heading: `Join ${family}`,
                text: `${inviter} has invited you to join as a parent. You will have full access to the family’s children, lessons, calendar and settings.`,
            },
            {
                heading: "Your own sign-in, one family",
                text: "Use this email address to join. You will share the family’s PIN, while keeping your own sign-in and email choices. Ask the other parent for the PIN; it is never sent by email.",
            },
        ],
        action: { label: "Review invitation", path: `/join#t=${encodeURIComponent(token)}` },
        footer: "This invitation lasts seven days. If you were not expecting it, you can ignore this email. Opening the link does not join the family.",
    });
}

export function membershipMail(
    origin: string,
    family: string,
    person: string,
    joined: boolean,
): MailContent {
    return frame({
        title: joined ? "Another pair of helping hands" : "Family access has changed",
        preheader: joined ? "A parent joined your family." : "A parent’s family access has ended.",
        origin,
        cover: joined ? 1 : 0,
        sections: [
            {
                heading: family,
                text: joined
                    ? `${person} has joined as a parent, with full access to the family.`
                    : `${person} no longer has parent access to this family. Their past contributions remain in the record. Remaining parents can change the shared PINs in Account.`,
            },
        ],
        action: { label: "Review family members", path: "/account#family-members" },
        footer: "This message is about family access. Weekly email preferences do not turn off access notifications.",
    });
}

import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, say } from "../lettering";
import { tick } from "../marks";
import { wrapTo } from "./lines";

/** The kinds of source a card is for, each with the small picture drawn on its corner. */
const KINDS = [
    "record made at the time",
    "newspaper report",
    "encyclopaedia entry",
    "letter or diary",
] as const;
/** The rows of a card, in order, which `ask` numbers from 1. */
const ROWS = ["Who", "When", "Where", "Were they there?"] as const;

interface SourceCardParams {
    title: string;
    /** 0 a record made at the time, 1 a newspaper report, 2 an encyclopaedia entry, 3 a letter or diary. */
    kind: number;
    who: string;
    when: string;
    where: string;
    /** 1 the writer saw it happen, 0 they did not. */
    there: number;
    /** A row left blank for the child to fill in: 0 none, 1 who, 2 when, 3 where, 4 were they there. */
    ask: number;
}

const W = 18;
const TEXT = 13;
const VALUE_X = 7.4 * U;
const VALUE_W = (W - 8.2) * U;

/** A first-hand source is written by someone who was there. */
export const firstHand = (p: Pick<SourceCardParams, "there">): boolean => Math.round(p.there) === 1;

const rowsOf = (p: SourceCardParams): string[][] =>
    [p.who, p.when, p.where]
        .map((v, i) => (Math.round(p.ask) === i + 1 ? [""] : wrapTo(v, VALUE_W, TEXT)))
        .concat([[""]]);

/** Where the rows start, below the title and the kind, in squares from the top. */
const rowsTop = (p: SourceCardParams): number =>
    1.8 + wrapTo(p.title, (W - 4.5) * U, 15).length * 0.95 + 1.4;

function boxOf(p: SourceCardParams): { w: number; h: number } {
    const end = rowsOf(p).reduce((y, lines) => y + lines.length * 0.95 + 0.7, rowsTop(p));
    return { w: W, h: Math.ceil(end + 0.1) };
}

function picture<G>(c: Ctx<G>, kind: number, x: number, y: number): void {
    const { pen, g } = c,
        w = { strokeWidth: 1.3 };
    if (kind === 0) {
        // a reel of recording tape
        pen.circle(g, x, y, 1.4 * U, "ruler", pen.fill("sky"), w);
        pen.circle(g, x, y, 0.4 * U, "ruler", pen.fill("card"), w);
        for (const a of [0, 2.1, 4.2])
            pen.circle(g, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 5, "ruler", pen.fill("card"), {
                strokeWidth: 1,
            });
    } else if (kind === 1) {
        // a folded newspaper with its columns
        pen.rect(g, x - 0.8 * U, y - 0.6 * U, 1.6 * U, 1.2 * U, "ruler", pen.fill("card"), w);
        pen.line(g, x - 0.6 * U, y - 0.35 * U, x + 0.6 * U, y - 0.35 * U, "ruler", {
            strokeWidth: 2,
        });
        for (const dx of [-0.3, 0.3])
            pen.line(g, x + dx * U, y - 0.15 * U, x + dx * U, y + 0.45 * U, "ruler", {
                strokeWidth: 0.9,
            });
    } else if (kind === 2) {
        // a thick reference book standing up
        pen.rect(g, x - 0.55 * U, y - 0.75 * U, 1.1 * U, 1.5 * U, "ruler", pen.fill("mint"), w);
        pen.line(g, x - 0.35 * U, y - 0.75 * U, x - 0.35 * U, y + 0.75 * U, "ruler", {
            strokeWidth: 1,
        });
        pen.line(g, x - 0.2 * U, y - 0.3 * U, x + 0.4 * U, y - 0.3 * U, "ruler", {
            strokeWidth: 1,
        });
    } else {
        // an envelope
        pen.rect(g, x - 0.8 * U, y - 0.5 * U, 1.6 * U, 1 * U, "ruler", pen.fill("card"), w);
        pen.linear(
            g,
            [
                [x - 0.8 * U, y - 0.5 * U],
                [x, y + 0.1 * U],
                [x + 0.8 * U, y - 0.5 * U],
            ],
            "ruler",
            { strokeWidth: 1.1 },
        );
    }
}

const APOLLO: SourceCardParams = {
    title: "Apollo 11 air-to-ground voice transcript",
    kind: 0,
    who: "NASA, from the crew's radio",
    when: "20 July 1969",
    where: "the Moon and Mission Control, Houston",
    there: 1,
    ask: 0,
};

export const sourceCard = defineDrawing<SourceCardParams>({
    id: "sourcecard",
    family: "writing",
    title: "Source card",
    group: "Structures",
    about: "An index card for one source a report is written from: its title, a small picture of its kind (`kind`: 0 a record made at the time, 1 a newspaper report, 2 an encyclopaedia entry, 3 a letter or diary), and a row each for who wrote it, when, where, and whether the writer was there (`there`: 1 yes, ticked; 0 no, crossed), which is what makes a source first-hand. `ask` leaves one row blank for the child to fill in (1 who, 2 when, 3 where, 4 were they there).",
    params: APOLLO,
    settings: {
        title: { kind: "text", most: 60 },
        kind: { kind: "whole", min: 0, max: 3 },
        who: { kind: "text", most: 60 },
        when: { kind: "text", most: 30 },
        where: { kind: "text", most: 60 },
        there: { kind: "whole", min: 0, max: 1 },
        ask: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "The mission's own transcript", params: APOLLO },
        {
            label: "A newspaper report, who asked",
            params: {
                title: "Men walk on the Moon",
                kind: 1,
                who: "A reporter at Mission Control",
                when: "21 July 1969",
                where: "Houston, Texas",
                there: 0,
                ask: 1,
            },
        },
        {
            label: "An encyclopaedia entry, there asked",
            params: {
                title: "Apollo 11",
                kind: 2,
                who: "The encyclopaedia's writers",
                when: "2026",
                where: "not stated",
                there: 0,
                ask: 4,
            },
        },
        {
            label: "A letter home",
            params: {
                title: "A letter from the harbour",
                kind: 3,
                who: "A sailor on the ship",
                when: "3 May 1850",
                where: "Liverpool",
                there: 1,
                ask: 0,
            },
        },
    ],
    box: (p) => boxOf(p),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            box = boxOf(p),
            ask = Math.round(p.ask);
        pen.rect(g, 0.4 * U, 0.6 * U, (W - 0.8) * U, (box.h - 1) * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        picture(c, Math.max(0, Math.min(3, Math.round(p.kind))), (W - 1.9) * U, 1.4 * U);
        let y = 1.8 * U;
        for (const s of wrapTo(p.title, (W - 4.5) * U, 15)) {
            say(c, 1 * U, y, s, 15, "start");
            y += 0.95 * U;
        }
        // the card's red rule under its title, as an index card has
        pen.line(g, 0.4 * U, y - 0.35 * U, (W - 0.4) * U, y - 0.35 * U, "ruler", {
            strokeWidth: 1.4,
            stroke: c.t.berry,
        });
        cap(
            c,
            1 * U,
            y + 0.3 * U,
            KINDS[Math.max(0, Math.min(3, Math.round(p.kind)))] ?? "",
            11,
            "start",
        );
        y += 1.4 * U;
        rowsOf(p).forEach((lines, i) => {
            const top = y;
            say(c, 1 * U, y + 0.2 * U, ROWS[i] ?? "", TEXT, "start", c.t["ink-soft"]);
            if (ask === i + 1) {
                pen.line(g, VALUE_X, y + 0.45 * U, (W - 1) * U, y + 0.45 * U, "ruler", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
                if (i === 3) penned(c, VALUE_X + 1 * U, y + 0.25 * U, "?", 20);
            } else if (i === 3) {
                pen.rect(g, VALUE_X, y - 0.5 * U, 0.9 * U, 0.9 * U, "ruler", null, {
                    strokeWidth: 1.3,
                });
                if (firstHand(p)) tick(c, VALUE_X + 1, y - 0.1 * U, 0.75);
                else {
                    pen.line(
                        g,
                        VALUE_X + 5,
                        y - 0.5 * U + 5,
                        VALUE_X + 0.9 * U - 5,
                        y + 0.4 * U - 5,
                        "ruler",
                        { strokeWidth: 2, stroke: c.t.pen },
                    );
                    pen.line(
                        g,
                        VALUE_X + 0.9 * U - 5,
                        y - 0.5 * U + 5,
                        VALUE_X + 5,
                        y + 0.4 * U - 5,
                        "ruler",
                        { strokeWidth: 2, stroke: c.t.pen },
                    );
                }
                say(
                    c,
                    VALUE_X + 1.3 * U,
                    y + 0.2 * U,
                    firstHand(p) ? "yes, first-hand" : "no, second-hand",
                    TEXT,
                    "start",
                );
            } else
                lines.forEach((s, k) =>
                    say(c, VALUE_X, y + 0.2 * U + k * 0.95 * U, s, TEXT, "start"),
                );
            y += lines.length * 0.95 * U + 0.7 * U;
            a[`row(${i})`] = [VALUE_X, top - 0.5 * U, "left"];
            // a faint rule under each row, as a ruled card has
            if (i < 3)
                plain(c, {
                    kind: "rect",
                    x: 1 * U,
                    y: y - 0.55 * U,
                    w: (W - 2) * U,
                    h: 0.8,
                    fill: c.t["ink-soft"],
                });
        });
        a.card = [(W * U) / 2, 0.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A ruled source card for ${p.title}, with a small picture of its kind and rows for who wrote it, when, where, and whether they were there.`,
});

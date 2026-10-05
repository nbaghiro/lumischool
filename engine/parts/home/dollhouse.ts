import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { asPerson, type CharlieParams } from "../people/charlie";
import { placePerson } from "../people/figure";
import { drawFurniture, FURNITURE_BOX } from "./furniture";
import { drawRoof } from "./dollroof";
import { drawRoom, ROOM_FLOOR, ROOM_H } from "./dollroom";

const CHARLIE: CharlieParams = {
    pose: "wave",
    mood: "happy",
    dir: 1,
    hair: "ponytail",
    top: "glow",
    sleeves: "short",
    print: "star",
    wear: "skirt",
    bottom: "berry",
    pattern: "stripes",
    feet: "shoes",
    holding: "",
};

export interface DollhouseParams {
    /** Whether Charlie stands in the living room waving. */
    charlie: boolean;
}

/**
 * A little dollhouse drawn whole: a bedroom over a living room beside a flight of stairs, under a
 * roof, the picture a dollhouse game is chosen by.
 */
export const dollhouse = defineDrawing<DollhouseParams>({
    id: "dollhouse",
    family: "home",
    title: "Dollhouse",
    group: "Structures",
    about: "A small dollhouse seen cut open from the front: a bedroom with a bed over a living room with a sofa and a lamp, stairs beside them and a pointed roof on top, sometimes with Charlie waving inside.",
    params: { charlie: true },
    settings: { charlie: { kind: "flag" } },
    takes: [
        { label: "With Charlie waving", params: { charlie: true } },
        { label: "Empty", params: { charlie: false } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p): RawAnchors => {
        const top = 2 * U,
            mid = top + ROOM_H * U;
        drawRoof(c, 0, 0, { w: 6, tone: "berry", chimney: true });
        drawRoom(c, 0, top, {
            w: 6,
            kind: "room",
            paper: "stripes",
            tone: "berry",
            floor: "boards",
            window: true,
            left: "wall",
            right: "wall",
        });
        drawRoom(c, 0, mid, {
            w: 6,
            kind: "room",
            paper: "spots",
            tone: "sky",
            floor: "carpet",
            window: false,
            left: "wall",
            right: "door",
        });
        drawRoom(c, 6 * U, mid, {
            w: 2,
            kind: "stairs",
            paper: "plain",
            tone: "tang",
            floor: "boards",
            window: false,
            left: "door",
            right: "wall",
        });
        const floorAt = (y: number) => y + (ROOM_H - ROOM_FLOOR) * U;
        // furniture is drawn at half its own size, as the game shows it, standing on its floor
        const stand = (x: number, floor: number, kind: "bed" | "sofa" | "lamp", tone: Marker) =>
            drawFurniture(
                c,
                x,
                floor - FURNITURE_BOX[kind].h * U * 0.5,
                { kind, tone, on: kind === "lamp" },
                0.5,
            );
        stand(0.4 * U, floorAt(top), "bed", "berry");
        stand(0.4 * U, floorAt(mid), "sofa", "mint");
        stand(4.6 * U, floorAt(mid), "lamp", "glow");
        if (p.charlie) placePerson(c, asPerson(CHARLIE), 3.9 * U, floorAt(mid), { size: 0.4 });
        return { door: [4 * U, 8 * U, "up"] };
    },
    describe: (p) =>
        p.charlie
            ? "A small dollhouse cut open from the front, a bedroom with a bed over a living room where Charlie stands waving, with stairs and a pointed roof."
            : "A small empty dollhouse cut open from the front, a bedroom with a bed over a living room with a sofa and a lamp, under a pointed roof.",
    motion: {
        still: "A dollhouse stands on its plot and holds still while its people move about inside.",
    },
});

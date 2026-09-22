// The columns of place value: their names, ones last, the short names an abacus fits, the colour each
// place is coded in, and the columns a written value needs. The chart, the abacus, the arrow cards
// and the digit's worth draw with them.
import { type Marker } from "../../paper";

/** Column names, ones last, as a child is taught to name them. */
export const WHOLE = ["Millions", "H Th", "T Th", "Thousands", "Hundreds", "Tens", "Ones"];

export const PARTS = ["Tenths", "Hundredths", "Thousandths"];

/** The same names where a column is only three squares wide. */
export const SHORT = ["M", "HTh", "TTh", "Th", "H", "T", "O"];

/** Cell width in squares for each character of a written number: a digit is three, a point is one. */
export const charCells = (value: string): number[] =>
    Array.from(value).map((ch) => (ch === "." ? 1 : 3));

/** The colour a place is coded in, ones first, so a hundred is the same colour wherever it appears. */
export const PLACE_FILL: Marker[] = ["sky", "mint", "tang", "berry", "glow"];

/** The columns a written value needs: one per digit, named, with the point marked. */
export function columns(value: string): { digit: string; head: string; part: boolean }[] {
    const [whole = "", frac = ""] = value.split(".");
    const w = Array.from(whole).map((d, i) => ({
        digit: d,
        head: WHOLE[WHOLE.length - whole.length + i] ?? "More",
        part: false,
    }));
    const f = Array.from(frac).map((d, i) => ({
        digit: d,
        head: PARTS[i] ?? "Smaller",
        part: true,
    }));
    return [...w, ...f];
}

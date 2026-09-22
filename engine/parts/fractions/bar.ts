// The bar every fraction drawing is built on, twelve squares long, and the colour each row takes.
import { type Marker } from "../../paper";

/** The bar every drawing in this file is built on: twelve squares, which halves, thirds, quarters,
 *  sixths and twelfths all divide exactly. Fifths and tenths do not, and are allowed to be off. */
export const BAR = 12;

export const ROW_FILL: Marker[] = ["sky", "mint", "tang", "berry", "glow"];

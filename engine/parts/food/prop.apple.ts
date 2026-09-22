import { defineDrawing } from "../drawing";
import { apple } from "../props";

export const appleV = defineDrawing({
    id: "prop.apple",
    family: "food",
    title: "Apple",
    group: "Props",
    about: "Story-problem counter.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c) => {
        apple(c, 20, 22, 26);
        return { top: [20, 6, "up"] };
    },
    describe: () =>
        "A red apple drawn in pencil, with a short stalk at the top and one small green leaf growing beside the stalk.",
    motion: { body: { is: "sway", deg: 4, period: 3.4, bend: true } },
});

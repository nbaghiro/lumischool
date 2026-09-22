import { STILL } from "../drawing";
import { strokesDrawing } from "./hand";

export const hills = strokesDrawing({
    name: "hills",
    family: "outdoors",
    title: "Hills with a path",
    about: "Two hills, a path over the near one and two trees, washed in with a highlighter so print keeps the ink and drops the colour. A landscape for a distance or a journey. Anchors at the ridge, the path and the near tree. Stroke file with pressure.",
    describe:
        "Two rolling hills washed in with a highlighter, a path winding over the nearer one and two trees standing on the slopes.",
    motion: { still: STILL.setting },
});

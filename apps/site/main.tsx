// The site's one page (.docs/auth.md, "Hosts"). The palette, the faces and the page's own styles come
// first, and the page is drawn once its faces have loaded, so its first frame is styled and set in
// the faces it keeps.

import { fontsReady } from "../../engine/ui/fonts";
import "../../engine/ui/palette.css";
import "./site.css";
import { render } from "solid-js/web";
import { Page } from "./page";

await fontsReady();
render(() => <Page />, document.body);

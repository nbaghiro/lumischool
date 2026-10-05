import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

/** The web map in phase 1; the native map replaces it in phase 2 (.docs/mobile.md). */
export default function Map(): ReactNode {
    return <WebHost opening="Opening the map" path="/map" as="adult" fullScreen={false} titled />;
}

import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

export default function Today(): ReactNode {
    return <WebHost opening="Opening your family" path="/" as="adult" fullScreen={false} titled />;
}

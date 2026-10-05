import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

export default function Games(): ReactNode {
    return (
        <WebHost opening="Opening the games" path="/games" as="adult" fullScreen={false} titled />
    );
}

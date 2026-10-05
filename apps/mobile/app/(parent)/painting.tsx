import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

export default function Painting(): ReactNode {
    return (
        <WebHost
            opening="Opening the easel"
            path="/painting"
            as="adult"
            fullScreen={false}
            titled
        />
    );
}

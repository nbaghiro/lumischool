import type { ReactNode } from "react";
import { WebHost } from "../../web-host";

export default function Calendar(): ReactNode {
    return (
        <WebHost
            opening="Opening the calendar"
            path="/calendar"
            as="adult"
            fullScreen={false}
            titled
        />
    );
}

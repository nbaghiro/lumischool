// Read-only compatibility audit; reports counts only, never mailbox addresses.
import { emailOf } from "../school/family/login";
import { open } from "./db/client";

const store = open();
try {
    const rows = await store.raw<{ email: string }[]>`select email from users`;
    const unsupported = rows.filter(({ email }) => emailOf(email) === null).length;
    const noncanonical = rows.filter(
        ({ email }) => emailOf(email) !== null && emailOf(email) !== email,
    ).length;
    process.stdout.write(
        `Email policy audit: ${rows.length} accounts; ${unsupported} unsupported; ${noncanonical} noncanonical.\n`,
    );
    if (unsupported || noncanonical) {
        process.stderr.write(
            "Review affected accounts before deployment; do not automatically rewrite mailbox identities.\n",
        );
        process.exitCode = 1;
    }
} finally {
    await store.close();
}

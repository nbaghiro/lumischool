/** Daily maintenance; the owner lists family ids, all deletes run under family RLS. */
import { open, withFamily, closeApp } from "./db/client";
import { families } from "./db/schema";
import { cleanTutoring } from "./db/tutoring";
const owner = open();
try {
    const rows = await owner.db.select({ id: families.id }).from(families);
    for (const row of rows) await withFamily({ family: row.id }, cleanTutoring);
    process.stdout.write(`Tutoring retention checked for ${rows.length} families.\n`);
} finally {
    await owner.close();
    await closeApp();
}

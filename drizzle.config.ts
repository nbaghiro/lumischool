// Used only by `npm run db:generate` and `db:check`; applying is server/db/migrations/migrate.ts.
import { defineConfig } from "drizzle-kit";
import { ownerUrl } from "./server/db/client";

export default defineConfig({
    schema: "./server/db/schema.ts",
    out: "./server/db/migrations",
    dialect: "postgresql",
    dbCredentials: { url: ownerUrl() },
});

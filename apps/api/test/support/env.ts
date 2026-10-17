import { randomUUID } from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";

// Jest runs this file (see `setupFiles` in jest.config.cjs) once per test
// file, before the test file itself is loaded. That ordering matters:
// `src/app.module.ts` reads DATABASE_PATH while it is being imported, and
// values already present in the environment take precedence over `.env`.

process.env.LEAF_API_KEY = "test-leaf-api-key";
process.env.TINIFY_API_KEY = "test-tinify-api-key";

// A fresh database per test file. The directory is created and removed by
// `useTestApp()`.
process.env.DATABASE_PATH = path.join(
    os.tmpdir(),
    `leaf-nest-test-${randomUUID()}`,
    "plants.db",
);

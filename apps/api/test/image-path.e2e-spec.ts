import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { auth, DATABASE_PATH, PROJECT_ROOT, useTestApp } from "./support/app";
import { writeDatabase } from "./support/sqlite";

// Clients cannot set `imagePath`, but a row may still hold one that points
// outside static/ (written before that was enforced, or by hand). Removing
// the plant's image must never delete anything but a file in static/.

/** A file next to static/, i.e. reachable from `process.cwd()`. */
const BYSTANDER = `leaf-nest-test-bystander-${randomUUID()}.txt`;
const BYSTANDER_FILE = path.join(PROJECT_ROOT, BYSTANDER);

describe("removing a plant's image", () => {
    const ctx = useTestApp();

    beforeEach(() => {
        fs.writeFileSync(BYSTANDER_FILE, "must survive");
    });

    afterAll(() => {
        fs.rmSync(BYSTANDER_FILE, { force: true });
    });

    function insertPlant(imagePath: string): number {
        let id = 0;
        writeDatabase(DATABASE_PATH, (db) => {
            const result = db
                .prepare(
                    `INSERT INTO "plants" ("name", "imagePath") VALUES (?, ?)`,
                )
                .run("Planted", imagePath);
            id = Number(result.lastInsertRowid);
        });
        return id;
    }

    it.each([
        ["outside static/", `/${BYSTANDER}`],
        ["escaping static/ with ..", `/static/../${BYSTANDER}`],
    ])(
        "leaves a file %s alone when the plant is deleted",
        async (_label, imagePath) => {
            const id = insertPlant(imagePath);

            const res = await ctx.request().delete(`/plants/${id}`).query(auth);

            expect(res.status).toBe(200);
            expect(fs.existsSync(BYSTANDER_FILE)).toBe(true);
            await ctx.request().get(`/plants/${id}`).query(auth).expect(404);
        },
    );
});

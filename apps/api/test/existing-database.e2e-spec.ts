import { auth, DATABASE_PATH, useTestApp } from "./support/app";
import { expectPlantList } from "./support/contract";
import {
    type Row,
    readPlantRows,
    readRows,
    writeDatabase,
} from "./support/sqlite";

// The production instance already has a SQLite file. This suite builds a file
// with the exact production schema and storage format *before* the app boots
// (using node:sqlite, not the driver under test) and then checks that the app
// neither rewrites it nor misreads it.

/** Byte-for-byte what `sqlite_master` holds in production. */
const PRODUCTION_DDL = `CREATE TABLE "plants" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(255) NOT NULL, "imagePath" varchar(500) NOT NULL DEFAULT ('/static/defaultPlant.png'), "lastWatered" datetime)`;

/** Synthetic rows in the shape of production data: UTC text dates, gaps in the ids. */
const PRODUCTION_ROWS = [
    {
        id: 3,
        name: "Monstera",
        imagePath: "/static/defaultPlant.png",
        lastWatered: "2026-09-28 17:45:12.345",
    },
    {
        id: 15,
        name: "Amélie",
        imagePath: "/static/plant_15_1759823011041.jpg",
        lastWatered: "2026-10-03 00:00:00.000",
    },
    {
        id: 21,
        name: "Žihľavky",
        imagePath: "/static/plant_21_1759912345678.png",
        lastWatered: null,
    },
    {
        id: 22,
        name: "Fikus",
        imagePath: "/static/plant_22_1760000000000.jpeg",
        lastWatered: "2025-12-31 23:59:59.999",
    },
];

/** Higher than the highest id: rows 23 to 25 existed once and were deleted. */
const PRODUCTION_SEQUENCE = 25;

/** The same rows as `GET /plants` must return them. */
const EXPECTED_PLANTS = [
    {
        id: 3,
        name: "Monstera",
        imagePath: "/static/defaultPlant.png",
        lastWatered: "2026-09-28T17:45:12.345Z",
    },
    {
        id: 15,
        name: "Amélie",
        imagePath: "/static/plant_15_1759823011041.jpg",
        lastWatered: "2026-10-03T00:00:00.000Z",
    },
    {
        id: 21,
        name: "Žihľavky",
        imagePath: "/static/plant_21_1759912345678.png",
        lastWatered: null,
    },
    {
        id: 22,
        name: "Fikus",
        imagePath: "/static/plant_22_1760000000000.jpeg",
        lastWatered: "2025-12-31T23:59:59.999Z",
    },
];

function createProductionDatabase(databasePath: string): void {
    writeDatabase(databasePath, (db) => {
        db.exec(PRODUCTION_DDL);
        const insert = db.prepare(
            `INSERT INTO "plants" ("id", "name", "imagePath", "lastWatered") VALUES (?, ?, ?, ?)`,
        );
        for (const row of PRODUCTION_ROWS) {
            insert.run(row.id, row.name, row.imagePath, row.lastWatered);
        }
        db.prepare(
            `UPDATE "sqlite_sequence" SET "seq" = ? WHERE "name" = 'plants'`,
        ).run(PRODUCTION_SEQUENCE);
    });
}

function readSchema(databasePath: string): Row[] {
    return readRows(
        databasePath,
        `SELECT "type", "name", "tbl_name", "sql" FROM "sqlite_master" ORDER BY "name"`,
    );
}

/** SQLite increments this number every time any statement changes the schema. */
function readSchemaVersion(databasePath: string): Row[] {
    return readRows(databasePath, "PRAGMA schema_version");
}

function readSequence(databasePath: string): Row[] {
    return readRows(
        databasePath,
        `SELECT "name", "seq" FROM "sqlite_sequence" ORDER BY "name"`,
    );
}

describe("an existing production database", () => {
    let schemaBeforeBoot: Row[];
    let schemaVersionBeforeBoot: Row[];
    let rowsBeforeBoot: Row[];

    const ctx = useTestApp({
        seedDatabase(databasePath) {
            createProductionDatabase(databasePath);
            schemaBeforeBoot = readSchema(databasePath);
            schemaVersionBeforeBoot = readSchemaVersion(databasePath);
            rowsBeforeBoot = readPlantRows(databasePath);
        },
    });

    function expectSchemaUnchanged(): void {
        const plantsTable = readRows(
            DATABASE_PATH,
            `SELECT "sql" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = 'plants'`,
        );
        expect(plantsTable).toEqual([{ sql: PRODUCTION_DDL }]);
        // No table, index or anything else was added, dropped or recreated.
        expect(readSchema(DATABASE_PATH)).toEqual(schemaBeforeBoot);
        expect(readSchemaVersion(DATABASE_PATH)).toEqual(
            schemaVersionBeforeBoot,
        );
    }

    it("was seeded with the production schema and rows (sanity check)", () => {
        expect(rowsBeforeBoot).toEqual(
            PRODUCTION_ROWS.map((row) => ({
                ...row,
                lastWateredType: row.lastWatered === null ? "null" : "text",
            })),
        );
        expect(schemaBeforeBoot.map((entry) => entry.name)).toEqual([
            "plants",
            "sqlite_sequence",
        ]);
    });

    it("is not altered by synchronize when the app boots", () => {
        expectSchemaUnchanged();
    });

    it("keeps every row and the autoincrement sequence as they were", () => {
        expect(readPlantRows(DATABASE_PATH)).toEqual(rowsBeforeBoot);
        expect(readSequence(DATABASE_PATH)).toEqual([
            { name: "plants", seq: PRODUCTION_SEQUENCE },
        ]);
    });

    it("returns the stored rows with ISO dates from GET /plants", async () => {
        const res = await ctx.request().get("/plants").query(auth);

        expect(res.status).toBe(200);
        const plants = expectPlantList(res.body).sort((a, b) => a.id - b.id);
        expect(plants).toEqual(EXPECTED_PLANTS);
    });

    it("returns a stored row from GET /plants/:id", async () => {
        const res = await ctx.request().get("/plants/15").query(auth);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(EXPECTED_PLANTS[1]);
    });

    it("does not modify the file by reading from it", () => {
        expect(readPlantRows(DATABASE_PATH)).toEqual(rowsBeforeBoot);
        expectSchemaUnchanged();
    });

    it("continues the stored autoincrement sequence for a new plant", async () => {
        const res = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Nová", lastWatered: "2026-10-10T00:00:00.000Z" });

        expect(res.status).toBe(201);
        // 26 follows the stored sequence (25); 23 would follow the highest id.
        expect(res.body.id).toBe(PRODUCTION_SEQUENCE + 1);
        expect(readSequence(DATABASE_PATH)).toEqual([
            { name: "plants", seq: PRODUCTION_SEQUENCE + 1 },
        ]);
        expect(readPlantRows(DATABASE_PATH)).toEqual([
            ...rowsBeforeBoot,
            {
                id: PRODUCTION_SEQUENCE + 1,
                name: "Nová",
                imagePath: "/static/defaultPlant.png",
                lastWatered: "2026-10-10 00:00:00.000",
                lastWateredType: "text",
            },
        ]);
    });

    it("updates a stored row in the same storage format without touching the others", async () => {
        const res = await ctx
            .request()
            .patch("/plants/15")
            .query(auth)
            .send({ lastWatered: "2026-10-10T06:30:00.000Z" });

        expect(res.status).toBe(200);
        const rows = readPlantRows(DATABASE_PATH);
        expect(rows.find((row) => row.id === 15)).toEqual({
            id: 15,
            name: "Amélie",
            imagePath: "/static/plant_15_1759823011041.jpg",
            lastWatered: "2026-10-10 06:30:00.000",
            lastWateredType: "text",
        });
        const originalIds = new Set(rowsBeforeBoot.map((row) => row.id));
        expect(
            rows.filter((row) => row.id !== 15 && originalIds.has(row.id)),
        ).toEqual(rowsBeforeBoot.filter((row) => row.id !== 15));
    });

    it("still has the original schema after writes", () => {
        expectSchemaUnchanged();
    });
});

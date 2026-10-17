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
// changes its schema only as intended, keeps its rows and reads them correctly.

/** Byte-for-byte what `sqlite_master` holds in production before `wateringIntervalDays`. */
const PRODUCTION_DDL = `CREATE TABLE "plants" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(255) NOT NULL, "imagePath" varchar(500) NOT NULL DEFAULT ('/static/defaultPlant.png'), "lastWatered" datetime)`;

/** The table after synchronize has added the `wateringIntervalDays` column. */
const SYNCHRONIZED_DDL = `CREATE TABLE "plants" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(255) NOT NULL, "imagePath" varchar(500) NOT NULL DEFAULT ('/static/defaultPlant.png'), "lastWatered" datetime, "wateringIntervalDays" integer)`;

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

/**
 * SQLite cannot add a column in place the way TypeORM wants, so synchronize
 * rebuilds the table (copy the rows, drop, rename). The rebuilt table's
 * autoincrement sequence restarts from the highest id, so ids of plants
 * deleted after the newest remaining one are handed out again once. In
 * production the two were equal when the column was added.
 */
const SYNCHRONIZED_SEQUENCE = 22;

/** The same rows as `GET /plants` must return them. */
const EXPECTED_PLANTS = [
    {
        id: 3,
        name: "Monstera",
        imagePath: "/static/defaultPlant.png",
        lastWatered: "2026-09-28T17:45:12.345Z",
        wateringIntervalDays: null,
    },
    {
        id: 15,
        name: "Amélie",
        imagePath: "/static/plant_15_1759823011041.jpg",
        lastWatered: "2026-10-03T00:00:00.000Z",
        wateringIntervalDays: null,
    },
    {
        id: 21,
        name: "Žihľavky",
        imagePath: "/static/plant_21_1759912345678.png",
        lastWatered: null,
        wateringIntervalDays: null,
    },
    {
        id: 22,
        name: "Fikus",
        imagePath: "/static/plant_22_1760000000000.jpeg",
        lastWatered: "2025-12-31T23:59:59.999Z",
        wateringIntervalDays: null,
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

function readWateringIntervals(databasePath: string): Row[] {
    return readRows(
        databasePath,
        `SELECT "id", "wateringIntervalDays" FROM "plants" ORDER BY "id"`,
    );
}

function readSequence(databasePath: string): Row[] {
    return readRows(
        databasePath,
        `SELECT "name", "seq" FROM "sqlite_sequence" ORDER BY "name"`,
    );
}

describe("an existing production database", () => {
    let schemaBeforeBoot: Row[];
    let schemaVersionAfterBoot: Row[];
    let rowsBeforeBoot: Row[];

    const ctx = useTestApp({
        seedDatabase(databasePath) {
            createProductionDatabase(databasePath);
            schemaBeforeBoot = readSchema(databasePath);
            rowsBeforeBoot = readPlantRows(databasePath);
        },
    });

    // Runs after useTestApp's beforeAll, i.e. once synchronize is done.
    beforeAll(() => {
        schemaVersionAfterBoot = readSchemaVersion(DATABASE_PATH);
    });

    function expectSynchronizedSchema(): void {
        const plantsTable = readRows(
            DATABASE_PATH,
            `SELECT "sql" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = 'plants'`,
        );
        expect(plantsTable).toEqual([{ sql: SYNCHRONIZED_DDL }]);
        // No table or index was added or dropped, and no temporary table is left over.
        expect(readSchema(DATABASE_PATH)).toEqual(
            schemaBeforeBoot.map((entry) =>
                entry.name === "plants"
                    ? { ...entry, sql: SYNCHRONIZED_DDL }
                    : entry,
            ),
        );
        // Nothing changed the schema again after the app booted.
        expect(readSchemaVersion(DATABASE_PATH)).toEqual(
            schemaVersionAfterBoot,
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

    it("only gains the wateringIntervalDays column when the app boots", () => {
        expectSynchronizedSchema();
    });

    it("keeps every row as it was, with no watering interval", () => {
        expect(readPlantRows(DATABASE_PATH)).toEqual(rowsBeforeBoot);
        expect(readWateringIntervals(DATABASE_PATH)).toEqual(
            PRODUCTION_ROWS.map((row) => ({
                id: row.id,
                wateringIntervalDays: null,
            })),
        );
    });

    it("restarts the autoincrement sequence from the highest id", () => {
        expect(readSequence(DATABASE_PATH)).toEqual([
            { name: "plants", seq: SYNCHRONIZED_SEQUENCE },
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
        expectSynchronizedSchema();
    });

    it("continues the autoincrement sequence for a new plant", async () => {
        const res = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Nová", lastWatered: "2026-10-10T00:00:00.000Z" });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe(SYNCHRONIZED_SEQUENCE + 1);
        expect(readSequence(DATABASE_PATH)).toEqual([
            { name: "plants", seq: SYNCHRONIZED_SEQUENCE + 1 },
        ]);
        expect(readPlantRows(DATABASE_PATH)).toEqual([
            ...rowsBeforeBoot,
            {
                id: SYNCHRONIZED_SEQUENCE + 1,
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

    it("stores a watering interval as an integer on a stored row", async () => {
        const res = await ctx
            .request()
            .patch("/plants/21")
            .query(auth)
            .send({ wateringIntervalDays: 10 });

        expect(res.status).toBe(200);
        expect(
            readRows(
                DATABASE_PATH,
                `SELECT "wateringIntervalDays", typeof("wateringIntervalDays") AS "type" FROM "plants" WHERE "id" = 21`,
            ),
        ).toEqual([{ wateringIntervalDays: 10, type: "integer" }]);
        expect(
            readPlantRows(DATABASE_PATH).find((row) => row.id === 21),
        ).toEqual(rowsBeforeBoot.find((row) => row.id === 21));
    });

    it("keeps the synchronized schema after writes", () => {
        expectSynchronizedSchema();
    });
});

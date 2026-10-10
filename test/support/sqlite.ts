import { DatabaseSync } from "node:sqlite";

// Direct access to a SQLite file through Node's built-in `node:sqlite`, i.e.
// independent of TypeORM and of the driver the application uses. The tests
// use it to seed a database before the app boots and to look at what the app
// really wrote.

export type Row = Record<string, string | number | null>;

/** Opens the file read-write, runs `fn`, and always closes it again. */
export function writeDatabase(
    databasePath: string,
    fn: (db: DatabaseSync) => void,
): void {
    const db = new DatabaseSync(databasePath);
    try {
        fn(db);
    } finally {
        db.close();
    }
}

/** Runs one query on a read-only connection and returns plain objects. */
export function readRows(
    databasePath: string,
    sql: string,
    ...params: (string | number | null)[]
): Row[] {
    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
        return db
            .prepare(sql)
            .all(...params)
            .map((row) => ({ ...row }) as Row);
    } finally {
        db.close();
    }
}

/** The columns of `plants` exactly as stored, plus the storage class of the date. */
export function readPlantRows(databasePath: string): Row[] {
    return readRows(
        databasePath,
        `SELECT "id", "name", "imagePath", "lastWatered",
                typeof("lastWatered") AS "lastWateredType"
         FROM "plants" ORDER BY "id"`,
    );
}

export function readPlantRow(databasePath: string, id: number): Row {
    const row = readPlantRows(databasePath).find((r) => r.id === id);
    if (row === undefined) {
        throw new Error(`No row with id ${id} in ${databasePath}`);
    }
    return row;
}

import { auth, DATABASE_PATH, useTestApp } from "./support/app";
import { readPlantRow } from "./support/sqlite";

/** `YYYY-MM-DD HH:MM:SS.mmm`, the text format of every date in the production database. */
const STORED_DATE_FORMAT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/;

/**
 * The write endpoints must hand back the instant they were given, as an ISO
 * 8601 string. Which spelling of that instant they use is deliberately left
 * open here; reads are pinned to the exact `toISOString()` form below.
 */
function expectIsoInstant(value: unknown, expectedIso: string): void {
    expect(typeof value).toBe("string");
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}(T|$)/);
    expect(new Date(value as string).toISOString()).toBe(expectedIso);
}

describe("lastWatered", () => {
    const ctx = useTestApp();

    async function getLastWatered(id: number) {
        const res = await ctx.request().get(`/plants/${id}`).query(auth);
        expect(res.status).toBe(200);
        return res.body.lastWatered;
    }

    it("runs in a time zone that differs from UTC", () => {
        // Otherwise a local-time/UTC mix-up could not be detected below.
        expect(new Date(2026, 0, 1).getTimezoneOffset()).not.toBe(0);
        expect(new Date(2026, 6, 1).getTimezoneOffset()).not.toBe(0);
    });

    it.each([
        {
            label: "a UTC timestamp",
            sent: "2026-10-03T00:00:00.000Z",
            iso: "2026-10-03T00:00:00.000Z",
            stored: "2026-10-03 00:00:00.000",
        },
        {
            label: "a timestamp with milliseconds",
            sent: "2026-07-15T13:45:12.345Z",
            iso: "2026-07-15T13:45:12.345Z",
            stored: "2026-07-15 13:45:12.345",
        },
        {
            label: "a timestamp with a UTC offset",
            sent: "2026-10-03T00:30:00+02:00",
            iso: "2026-10-02T22:30:00.000Z",
            stored: "2026-10-02 22:30:00.000",
        },
        {
            label: "a date without a time",
            sent: "2026-10-03",
            iso: "2026-10-03T00:00:00.000Z",
            stored: "2026-10-03 00:00:00.000",
        },
    ])("POST with $label stores UTC text and reads back as ISO", async ({
        sent,
        iso,
        stored,
    }) => {
        const res = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Dated", lastWatered: sent });

        expect(res.status).toBe(201);
        expectIsoInstant(res.body.lastWatered, iso);
        expect(await getLastWatered(res.body.id)).toBe(iso);

        const row = readPlantRow(DATABASE_PATH, res.body.id);
        expect(row.lastWateredType).toBe("text");
        expect(row.lastWatered).toMatch(STORED_DATE_FORMAT);
        expect(row.lastWatered).toBe(stored);
    });

    it("PATCH stores UTC text and reads back as ISO", async () => {
        const created = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Thirsty" });

        const res = await ctx
            .request()
            .patch(`/plants/${created.body.id}`)
            .query(auth)
            .send({ lastWatered: "2026-12-31T23:59:59.999-08:00" });

        expect(res.status).toBe(200);
        expectIsoInstant(res.body.lastWatered, "2027-01-01T07:59:59.999Z");
        expect(await getLastWatered(created.body.id)).toBe(
            "2027-01-01T07:59:59.999Z",
        );

        const row = readPlantRow(DATABASE_PATH, created.body.id);
        expect(row.lastWateredType).toBe("text");
        expect(row.lastWatered).toMatch(STORED_DATE_FORMAT);
        expect(row.lastWatered).toBe("2027-01-01 07:59:59.999");
    });

    it("PATCH replaces an earlier date", async () => {
        const created = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Regular", lastWatered: "2026-10-03T00:00:00.000Z" });

        await ctx
            .request()
            .patch(`/plants/${created.body.id}`)
            .query(auth)
            .send({ lastWatered: "2026-10-10T08:15:00.000Z" })
            .expect(200);

        expect(await getLastWatered(created.body.id)).toBe(
            "2026-10-10T08:15:00.000Z",
        );
        expect(readPlantRow(DATABASE_PATH, created.body.id).lastWatered).toBe(
            "2026-10-10 08:15:00.000",
        );
    });

    it("stores NULL when no date is given", async () => {
        const res = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Never watered" });

        expect(await getLastWatered(res.body.id)).toBeNull();

        const row = readPlantRow(DATABASE_PATH, res.body.id);
        expect(row.lastWateredType).toBe("null");
        expect(row.lastWatered).toBeNull();
    });

    it("PATCH with null clears the date", async () => {
        const created = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Reset", lastWatered: "2026-10-03T00:00:00.000Z" });

        const res = await ctx
            .request()
            .patch(`/plants/${created.body.id}`)
            .query(auth)
            .send({ lastWatered: null });

        expect(res.status).toBe(200);
        expect(await getLastWatered(created.body.id)).toBeNull();
        expect(
            readPlantRow(DATABASE_PATH, created.body.id).lastWateredType,
        ).toBe("null");
    });

    it("returns ISO dates in the list", async () => {
        const created = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name: "Listed", lastWatered: "2026-03-29T01:30:00.000Z" });

        const res = await ctx.request().get("/plants").query(auth);

        const listed = (
            res.body as { id: number; lastWatered: unknown }[]
        ).find((plant) => plant.id === created.body.id);
        expect(listed?.lastWatered).toBe("2026-03-29T01:30:00.000Z");
    });
});

import { expectPlant, expectPlantList } from "./support/contract";
import { auth, useTestApp } from "./support/app";

// Every response that carries plants must match the schema the web app
// checks at runtime. (The image upload response is covered in
// image-upload.e2e-spec.ts, which has the upload helpers.)

describe("response contract", () => {
    const ctx = useTestApp();

    async function createPlant(body: Record<string, unknown>) {
        const res = await ctx.request().post("/plants").query(auth).send(body);
        expect(res.status).toBe(201);
        return res;
    }

    it.each([
        ["without a watering date", { name: "Dry" }],
        ["with a calendar date", { name: "Dated", lastWatered: "2026-10-03" }],
        [
            "with a date-time and offset",
            { name: "Offset", lastWatered: "2026-10-03T00:30:00+02:00" },
        ],
    ])("POST /plants %s", async (_label, body) => {
        expectPlant((await createPlant(body)).body);
    });

    it("GET /plants", async () => {
        await createPlant({ name: "Listed", lastWatered: "2026-10-03" });
        await createPlant({ name: "Listed too" });

        const res = await ctx.request().get("/plants").query(auth);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expectPlantList(res.body);
    });

    it("GET /plants/:id", async () => {
        const created = await createPlant({ name: "Single" });

        const res = await ctx
            .request()
            .get(`/plants/${created.body.id}`)
            .query(auth);

        expect(res.status).toBe(200);
        expectPlant(res.body);
    });

    it.each([
        ["a new name", { name: "Renamed" }],
        ["a watering date", { lastWatered: "2026-10-10" }],
        ["a cleared watering date", { lastWatered: null }],
    ])("PATCH /plants/:id with %s", async (_label, body) => {
        const created = await createPlant({
            name: "Patched",
            lastWatered: "2026-10-03",
        });

        const res = await ctx
            .request()
            .patch(`/plants/${created.body.id}`)
            .query(auth)
            .send(body);

        expect(res.status).toBe(200);
        expectPlant(res.body);
    });
});

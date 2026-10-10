import { auth, useTestApp } from "./support/app";

const DEFAULT_IMAGE_PATH = "/static/defaultPlant.png";
const MISSING_ID = 999_999;

describe("/plants", () => {
    const ctx = useTestApp();

    async function createPlant(body: Record<string, unknown>) {
        const res = await ctx.request().post("/plants").query(auth).send(body);
        expect(res.status).toBe(201);
        return res.body as {
            id: number;
            name: string;
            imagePath: string;
            lastWatered: string | null;
        };
    }

    async function getPlant(id: number) {
        const res = await ctx.request().get(`/plants/${id}`).query(auth);
        expect(res.status).toBe(200);
        return res.body;
    }

    async function listPlants() {
        const res = await ctx.request().get("/plants").query(auth);
        expect(res.status).toBe(200);
        return res.body as { id: number }[];
    }

    describe("CRUD", () => {
        it("lists nothing in a fresh database", async () => {
            expect(await listPlants()).toEqual([]);
        });

        it("creates a plant with the default image and no watering date", async () => {
            const res = await ctx
                .request()
                .post("/plants")
                .query(auth)
                .send({ name: "Monstera" });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({
                id: expect.any(Number),
                name: "Monstera",
                imagePath: DEFAULT_IMAGE_PATH,
                lastWatered: null,
            });
        });

        it("assigns consecutive ids", async () => {
            const first = await createPlant({ name: "First" });
            const second = await createPlant({ name: "Second" });

            expect(second.id).toBe(first.id + 1);
        });

        it("returns one plant by id", async () => {
            const created = await createPlant({ name: "Ficus" });

            const res = await ctx
                .request()
                .get(`/plants/${created.id}`)
                .query(auth);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                id: created.id,
                name: "Ficus",
                imagePath: DEFAULT_IMAGE_PATH,
                lastWatered: null,
            });
        });

        it("lists every plant", async () => {
            const a = await createPlant({ name: "Aloe" });
            const b = await createPlant({ name: "Begonia" });

            const plants = await listPlants();

            expect(plants).toEqual(
                expect.arrayContaining([
                    {
                        id: a.id,
                        name: "Aloe",
                        imagePath: DEFAULT_IMAGE_PATH,
                        lastWatered: null,
                    },
                    {
                        id: b.id,
                        name: "Begonia",
                        imagePath: DEFAULT_IMAGE_PATH,
                        lastWatered: null,
                    },
                ]),
            );
        });

        it("keeps non-ASCII names intact", async () => {
            const created = await createPlant({ name: "Žihľavky Amélie 🌱" });

            expect(created.name).toBe("Žihľavky Amélie 🌱");
            expect((await getPlant(created.id)).name).toBe(
                "Žihľavky Amélie 🌱",
            );
        });

        it("updates a plant and leaves the other fields alone", async () => {
            const created = await createPlant({
                name: "Old name",
                lastWatered: "2026-10-03T00:00:00.000Z",
            });

            const res = await ctx
                .request()
                .patch(`/plants/${created.id}`)
                .query(auth)
                .send({ name: "New name" });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                id: created.id,
                name: "New name",
            });
            expect(await getPlant(created.id)).toEqual({
                id: created.id,
                name: "New name",
                imagePath: DEFAULT_IMAGE_PATH,
                lastWatered: "2026-10-03T00:00:00.000Z",
            });
        });

        it("only changes the plant that was patched", async () => {
            const target = await createPlant({ name: "Target" });
            const bystander = await createPlant({ name: "Bystander" });

            await ctx
                .request()
                .patch(`/plants/${target.id}`)
                .query(auth)
                .send({ name: "Renamed" })
                .expect(200);

            expect((await getPlant(bystander.id)).name).toBe("Bystander");
        });

        it("deletes a plant", async () => {
            const created = await createPlant({ name: "Doomed" });

            const res = await ctx
                .request()
                .delete(`/plants/${created.id}`)
                .query(auth);

            expect(res.status).toBe(200);
            expect(res.text).toBe("");
            await ctx
                .request()
                .get(`/plants/${created.id}`)
                .query(auth)
                .expect(404);
            expect((await listPlants()).map((p) => p.id)).not.toContain(
                created.id,
            );
        });

        it("never reuses the id of a deleted plant", async () => {
            const last = await createPlant({ name: "Last one" });
            await ctx
                .request()
                .delete(`/plants/${last.id}`)
                .query(auth)
                .expect(200);

            const next = await createPlant({ name: "Next one" });

            expect(next.id).toBe(last.id + 1);
        });

        it.each([
            "get",
            "patch",
            "delete",
        ] as const)("responds 404 to %s for an id that does not exist", async (method) => {
            const res = await ctx
                .request()
                [method](`/plants/${MISSING_ID}`)
                .query(auth)
                .send({});

            expect(res.status).toBe(404);
            expect(res.body.statusCode).toBe(404);
        });

        it.each([
            "get",
            "patch",
            "delete",
        ] as const)("responds 400 to %s for a non-numeric id", async (method) => {
            const res = await ctx
                .request()
                [method]("/plants/abc")
                .query(auth)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.statusCode).toBe(400);
        });
    });

    describe("validation", () => {
        const invalidBodies: [string, Record<string, unknown>][] = [
            ["an unknown property", { name: "Fern", color: "green" }],
            [
                "an invalid lastWatered",
                { name: "Fern", lastWatered: "yesterday" },
            ],
            ["a non-string name", { name: 42 }],
        ];

        it.each(invalidBodies)("rejects POST with %s", async (_label, body) => {
            const before = await listPlants();

            const res = await ctx
                .request()
                .post("/plants")
                .query(auth)
                .send(body);

            expect(res.status).toBe(400);
            expect(res.body.statusCode).toBe(400);
            expect(await listPlants()).toEqual(before);
        });

        it.each(
            invalidBodies,
        )("rejects PATCH with %s", async (_label, body) => {
            const created = await createPlant({ name: "Untouched" });

            const res = await ctx
                .request()
                .patch(`/plants/${created.id}`)
                .query(auth)
                .send(body);

            expect(res.status).toBe(400);
            expect(res.body.statusCode).toBe(400);
            expect(await getPlant(created.id)).toEqual(created);
        });

        it("does not let a client change the id", async () => {
            const created = await createPlant({ name: "Fixed id" });

            const res = await ctx
                .request()
                .patch(`/plants/${created.id}`)
                .query(auth)
                .send({ id: created.id + 1000 });

            expect(res.status).toBe(400);
            expect(await getPlant(created.id)).toEqual(created);
        });
    });
});

import * as fs from "node:fs";
import * as path from "node:path";
import { auth, STATIC_DIR, useTestApp } from "./support/app";

// Things configured on the application instance in src/configure-app.ts
// rather than in a controller: static files, Swagger and CORS.

describe("application setup", () => {
    const ctx = useTestApp();

    describe("static files", () => {
        it("serves static/defaultPlant.png at /static/defaultPlant.png", async () => {
            const res = await ctx.request().get("/static/defaultPlant.png");

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toBe("image/png");
            expect(
                (res.body as Buffer).equals(
                    fs.readFileSync(path.join(STATIC_DIR, "defaultPlant.png")),
                ),
            ).toBe(true);
        });

        it("responds 404 for a file that does not exist", async () => {
            const res = await ctx.request().get("/static/no-such-plant.png");

            expect(res.status).toBe(404);
        });
    });

    describe("Swagger", () => {
        it("serves the OpenAPI document at /api-json", async () => {
            const res = await ctx.request().get("/api-json");

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/^application\/json/);
            expect(res.body.info).toMatchObject({
                title: "LEAF",
                description: "API for watering plants",
            });
        });

        it("documents every /plants route", async () => {
            const res = await ctx.request().get("/api-json");

            const methodsOf = (route: string) =>
                Object.keys(res.body.paths[route] ?? {}).sort();
            expect(methodsOf("/plants")).toEqual(["get", "post"]);
            expect(methodsOf("/plants/{id}")).toEqual([
                "delete",
                "get",
                "patch",
            ]);
            expect(methodsOf("/plants/{id}/image")).toEqual(["post"]);
        });

        it("serves the Swagger UI at /api", async () => {
            const res = await ctx.request().get("/api");

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/^text\/html/);
            expect(res.text).toContain("Swagger UI");
        });
    });

    describe("CORS", () => {
        const origin = "https://leaf.example";

        it("allows any origin on an API response", async () => {
            const res = await ctx
                .request()
                .get("/plants")
                .query(auth)
                .set("Origin", origin);

            expect(res.status).toBe(200);
            expect(res.headers["access-control-allow-origin"]).toBe("*");
        });

        it("allows any origin on an error response", async () => {
            const res = await ctx
                .request()
                .get("/plants")
                .set("Origin", origin);

            expect(res.status).toBe(401);
            expect(res.headers["access-control-allow-origin"]).toBe("*");
        });

        it("allows any origin on a static file", async () => {
            const res = await ctx
                .request()
                .get("/static/defaultPlant.png")
                .set("Origin", origin);

            expect(res.headers["access-control-allow-origin"]).toBe("*");
        });

        it("answers a preflight request for the methods the API uses", async () => {
            const res = await ctx
                .request()
                .options("/plants/1")
                .set("Origin", origin)
                .set("Access-Control-Request-Method", "PATCH");

            expect(res.status).toBe(204);
            expect(res.headers["access-control-allow-origin"]).toBe("*");
            const allowed = String(
                res.headers["access-control-allow-methods"],
            ).split(",");
            expect(allowed).toEqual(
                expect.arrayContaining(["GET", "POST", "PATCH", "DELETE"]),
            );
        });
    });
});

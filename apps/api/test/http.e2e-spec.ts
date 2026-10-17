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

        it("documents the apiKey query parameter that every route requires", async () => {
            const doc = (await ctx.request().get("/api-json")).body;

            // Lets Swagger UI's "Authorize" button send the key with
            // "Try it out" requests.
            expect(doc.components.securitySchemes).toEqual({
                apiKey: { type: "apiKey", in: "query", name: "apiKey" },
            });
            for (const [route, operations] of Object.entries(
                doc.paths as Record<string, Record<string, unknown>>,
            )) {
                for (const [method, operation] of Object.entries(operations)) {
                    expect({
                        route,
                        method,
                        security: (operation as { security?: unknown })
                            .security,
                    }).toEqual({ route, method, security: [{ apiKey: [] }] });
                }
            }
        });

        it("documents the plant request bodies and responses", async () => {
            const doc = (await ctx.request().get("/api-json")).body;
            type Schema = {
                $ref?: string;
                type?: string;
                items?: Schema;
                properties?: Record<string, unknown>;
                required?: string[];
            };
            // Inline schemas and `$ref`s to components are both fine.
            const resolve = (schema: Schema): Schema =>
                schema.$ref
                    ? resolve(
                          doc.components.schemas[
                              schema.$ref.replace("#/components/schemas/", "")
                          ],
                      )
                    : schema;
            const bodyOf = (route: string, method: string): Schema =>
                resolve(
                    doc.paths[route][method].requestBody.content[
                        "application/json"
                    ].schema,
                );
            const responseOf = (
                route: string,
                method: string,
                status: string,
            ): Schema =>
                resolve(
                    doc.paths[route][method].responses[status].content[
                        "application/json"
                    ].schema,
                );
            const propertiesOf = (schema: Schema) =>
                Object.keys(schema.properties ?? {}).sort();
            const plantProperties = [
                "id",
                "imagePath",
                "lastWatered",
                "name",
                "wateringIntervalDays",
            ];

            expect(propertiesOf(bodyOf("/plants", "post"))).toEqual([
                "lastWatered",
                "name",
                "wateringIntervalDays",
            ]);
            expect(bodyOf("/plants", "post").required).toEqual(["name"]);
            expect(propertiesOf(bodyOf("/plants/{id}", "patch"))).toEqual([
                "lastWatered",
                "name",
                "wateringIntervalDays",
            ]);
            expect(bodyOf("/plants/{id}", "patch").required ?? []).toEqual([]);

            expect(propertiesOf(responseOf("/plants", "post", "201"))).toEqual(
                plantProperties,
            );
            const list = responseOf("/plants", "get", "200");
            expect(list.type).toBe("array");
            expect(propertiesOf(resolve(list.items as Schema))).toEqual(
                plantProperties,
            );
            for (const method of ["get", "patch"]) {
                expect(
                    propertiesOf(responseOf("/plants/{id}", method, "200")),
                ).toEqual(plantProperties);
            }
            expect(
                propertiesOf(responseOf("/plants/{id}/image", "post", "201")),
            ).toEqual(plantProperties);
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

import { API_KEY, auth, useTestApp } from "./support/app";

describe("API key guard", () => {
    const ctx = useTestApp();

    describe.each(["/", "/plants"])("GET %s", (url) => {
        it("responds 401 without an API key", async () => {
            const res = await ctx.request().get(url);

            expect(res.status).toBe(401);
            expect(res.body.statusCode).toBe(401);
        });

        it("responds 401 with a wrong API key", async () => {
            const res = await ctx
                .request()
                .get(url)
                .query({ apiKey: `${API_KEY}-wrong` });

            expect(res.status).toBe(401);
            expect(res.body.statusCode).toBe(401);
        });

        it("responds 200 with the correct API key", async () => {
            const res = await ctx.request().get(url).query(auth);

            expect(res.status).toBe(200);
        });
    });

    it("returns the greeting on / once authenticated", async () => {
        const res = await ctx.request().get("/").query(auth);

        expect(res.text).toBe("Hello World!");
    });

    it.each([
        ["post", "/plants"],
        ["get", "/plants/1"],
        ["patch", "/plants/1"],
        ["delete", "/plants/1"],
        ["post", "/plants/1/image"],
    ] as const)(
        "%s %s responds 401 without an API key",
        async (method, url) => {
            const res = await ctx.request()[method](url);

            expect(res.status).toBe(401);
        },
    );

    it("created nothing through the rejected requests", async () => {
        const res = await ctx.request().get("/plants").query(auth);

        expect(res.body).toEqual([]);
    });
});

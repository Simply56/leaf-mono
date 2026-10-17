import * as fs from "node:fs";
import * as path from "node:path";
import { auth, STATIC_DIR, useTestApp } from "./support/app";
import { COMPRESSED_PREFIX, tinifyCalls } from "./support/tinify-mock";

const DEFAULT_IMAGE_PATH = "/static/defaultPlant.png";
const TEN_MEGABYTES = 10 * 1024 * 1024;

/** A valid 1x1 PNG. */
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
);

async function waitFor(condition: () => boolean): Promise<void> {
    const deadline = Date.now() + 5000;
    while (!condition()) {
        if (Date.now() > deadline) {
            throw new Error("Timed out waiting for the background compression");
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

describe("POST /plants/:id/image", () => {
    const ctx = useTestApp();

    async function createPlant(name: string): Promise<number> {
        const res = await ctx
            .request()
            .post("/plants")
            .query(auth)
            .send({ name });
        expect(res.status).toBe(201);
        return res.body.id;
    }

    async function getImagePath(id: number): Promise<string> {
        const res = await ctx.request().get(`/plants/${id}`).query(auth);
        expect(res.status).toBe(200);
        return res.body.imagePath;
    }

    /**
     * The service compresses in the background after it has responded: it
     * asks tinify to write `<file>.tmp` and then renames that over `<file>`.
     * Waiting for the rename keeps the tests free of races with that step.
     */
    async function compressionFinished(file: string): Promise<void> {
        const temporaryFile = `${file}.tmp`;
        await waitFor(
            () =>
                tinifyCalls.toFile.mock.calls.some(
                    ([destination]) => destination === temporaryFile,
                ) && !fs.existsSync(temporaryFile),
        );
    }

    /**
     * Uploads a file. Every file the application stores is registered for
     * cleanup right away, and the background compression is awaited.
     */
    async function upload(id: number, filename: string, content: Buffer = PNG) {
        const res = await ctx
            .request()
            .post(`/plants/${id}/image`)
            .query(auth)
            .attach("image", content, filename);
        let file: string | undefined;
        if (res.status === 201) {
            file = ctx.trackUpload(res.body.imagePath);
            await compressionFinished(file);
        }
        return { res, file };
    }

    /** Names of everything in static/ that belongs to one plant. */
    function filesOf(id: number): string[] {
        return fs
            .readdirSync(STATIC_DIR)
            .filter((name) => name.startsWith(`plant_${id}_`))
            .sort();
    }

    beforeEach(() => {
        tinifyCalls.fromFile.mockClear();
        tinifyCalls.resize.mockClear();
        tinifyCalls.toFile.mockClear();
    });

    it("stores a .png and points the plant at it", async () => {
        const id = await createPlant("Photogenic");

        const { res, file } = await upload(id, "photo.png");

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id, name: "Photogenic" });
        expect(res.body.imagePath).toMatch(
            new RegExp(`^/static/plant_${id}_\\d+\\.png$`),
        );
        expect(await getImagePath(id)).toBe(res.body.imagePath);
        expect(filesOf(id)).toEqual([
            res.body.imagePath.slice("/static/".length),
        ]);
        expect(fs.existsSync(file as string)).toBe(true);
    });

    it("sends the stored file through tinify with the resize options, never the real API", async () => {
        const id = await createPlant("Compressed");

        const { file } = await upload(id, "photo.png");

        expect(tinifyCalls.fromFile.mock.calls).toEqual([[file]]);
        expect(tinifyCalls.resize.mock.calls).toEqual([
            [{ method: "cover", width: 500, height: 500 }],
        ]);
        expect(tinifyCalls.toFile.mock.calls).toEqual([[`${file}.tmp`]]);
        // The mock "compresses" by prefixing the bytes it was given: the raw
        // upload was on disk first and was then replaced by tinify's output.
        expect(
            fs
                .readFileSync(file as string)
                .equals(Buffer.concat([COMPRESSED_PREFIX, PNG])),
        ).toBe(true);
    });

    it("serves the stored file at the returned imagePath", async () => {
        const id = await createPlant("Served");
        const { res: uploaded, file } = await upload(id, "photo.png");

        const res = await ctx.request().get(uploaded.body.imagePath);

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("image/png");
        expect(
            (res.body as Buffer).equals(fs.readFileSync(file as string)),
        ).toBe(true);
    });

    it.each([".jpg", ".jpeg", ".gif"])(
        "accepts a %s file and keeps its extension",
        async (extension) => {
            const id = await createPlant("Other format");

            const { res } = await upload(id, `photo${extension}`);

            expect(res.status).toBe(201);
            expect(res.body.imagePath).toMatch(
                new RegExp(`^/static/plant_${id}_\\d+\\${extension}$`),
            );
        },
    );

    it("responds 400 to a file with another extension", async () => {
        const id = await createPlant("Picky");

        const { res } = await upload(
            id,
            "notes.txt",
            Buffer.from("not an image"),
        );

        expect(res.status).toBe(400);
        expect(await getImagePath(id)).toBe(DEFAULT_IMAGE_PATH);
        expect(filesOf(id)).toEqual([]);
    });

    it("responds 400 when no file is sent", async () => {
        const id = await createPlant("Empty handed");

        const res = await ctx
            .request()
            .post(`/plants/${id}/image`)
            .query(auth)
            .field("caption", "no file here");

        expect(res.status).toBe(400);
        expect(await getImagePath(id)).toBe(DEFAULT_IMAGE_PATH);
        expect(filesOf(id)).toEqual([]);
    });

    it("responds 413 to a file larger than 10MB", async () => {
        const id = await createPlant("Too big");

        const { res } = await upload(
            id,
            "huge.png",
            Buffer.alloc(TEN_MEGABYTES + 1),
        );

        expect(res.status).toBe(413);
        expect(await getImagePath(id)).toBe(DEFAULT_IMAGE_PATH);
        expect(filesOf(id)).toEqual([]);
        expect(tinifyCalls.fromFile).not.toHaveBeenCalled();
    });

    it("responds 404 for a plant that does not exist", async () => {
        const { res } = await upload(999_999, "photo.png");

        expect(res.status).toBe(404);
        expect(filesOf(999_999)).toEqual([]);
    });

    it("removes the previous file when a new one is uploaded", async () => {
        const id = await createPlant("Makeover");
        const first = await upload(id, "before.png");
        // The file name contains a millisecond timestamp; make sure it differs.
        await new Promise((resolve) => setTimeout(resolve, 5));

        const second = await upload(id, "after.jpg");

        expect(second.res.status).toBe(201);
        expect(second.res.body.imagePath).not.toBe(first.res.body.imagePath);
        expect(fs.existsSync(first.file as string)).toBe(false);
        expect(fs.existsSync(second.file as string)).toBe(true);
        expect(filesOf(id)).toEqual([
            second.res.body.imagePath.slice("/static/".length),
        ]);
        await ctx.request().get(first.res.body.imagePath).expect(404);
        expect(await getImagePath(id)).toBe(second.res.body.imagePath);
    });

    it("removes the file when the plant is deleted", async () => {
        const id = await createPlant("Short lived");
        const { res: uploaded, file } = await upload(id, "photo.png");

        await ctx.request().delete(`/plants/${id}`).query(auth).expect(200);

        expect(fs.existsSync(file as string)).toBe(false);
        expect(filesOf(id)).toEqual([]);
        await ctx.request().get(uploaded.body.imagePath).expect(404);
    });

    it("never touches the default image", async () => {
        const defaultImage = path.join(STATIC_DIR, "defaultPlant.png");
        const before = fs.readFileSync(defaultImage);
        const uploadedTo = await createPlant("Had a photo");
        const untouched = await createPlant("Kept the default");

        await upload(uploadedTo, "photo.png");
        await upload(uploadedTo, "another.png");
        for (const id of [uploadedTo, untouched]) {
            await ctx.request().delete(`/plants/${id}`).query(auth).expect(200);
        }

        expect(fs.readFileSync(defaultImage).equals(before)).toBe(true);
    });
});

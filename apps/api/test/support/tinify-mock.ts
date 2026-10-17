import * as fs from "node:fs";

// Stand-in for the `tinify` package (TinyPNG, a paid external API). Jest maps
// every `import ... from "tinify"` to this file (see `moduleNameMapper` in
// jest.config.cjs), so the real client is never loaded and no request can
// leave the machine.

/**
 * The fake compressor writes this marker followed by the original bytes, so
 * a test can tell both that the raw upload reached disk and that it was
 * replaced by the "compressed" output.
 */
export const COMPRESSED_PREFIX = Buffer.from("compressed-by-tinify-mock:");

/** One call is recorded per step of `fromFile().resize().toFile()`. */
export const tinifyCalls = {
    fromFile: jest.fn<void, [source: string]>(),
    resize: jest.fn<void, [options: unknown]>(),
    /** Recorded only after the destination file has been written. */
    toFile: jest.fn<void, [destination: string]>(),
};

const tinifyMock = {
    key: "",
    fromFile(source: string) {
        tinifyCalls.fromFile(source);
        return {
            resize(options: unknown) {
                tinifyCalls.resize(options);
                return {
                    async toFile(destination: string): Promise<void> {
                        const original = await fs.promises.readFile(source);
                        await fs.promises.writeFile(
                            destination,
                            Buffer.concat([COMPRESSED_PREFIX, original]),
                        );
                        tinifyCalls.toFile(destination);
                    },
                };
            },
        };
    },
};

export default tinifyMock;

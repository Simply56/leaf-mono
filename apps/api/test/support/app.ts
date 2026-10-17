import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";

export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

/** Where the service writes uploads: `process.cwd()/static`. */
export const STATIC_DIR = path.join(PROJECT_ROOT, "static");

/** Both values are set by test/support/env.ts before any test file loads. */
export const API_KEY = requireEnv("LEAF_API_KEY");
export const DATABASE_PATH = requireEnv("DATABASE_PATH");

/** Query string that authenticates a request. */
export const auth = { apiKey: API_KEY };

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `${name} is not set; test/support/env.ts must run first (jest setupFiles)`,
        );
    }
    return value;
}

/** Refuses to run against anything but a throwaway database and the repo's own static/. */
function assertIsolated(): void {
    const databaseDir = path.dirname(DATABASE_PATH);
    if (
        path.dirname(databaseDir) !== os.tmpdir() ||
        !path.basename(databaseDir).startsWith("leaf-nest-test-")
    ) {
        throw new Error(
            `Refusing to use non-temporary database ${DATABASE_PATH}`,
        );
    }
    if (process.cwd() !== PROJECT_ROOT) {
        throw new Error(
            `Tests must run from ${PROJECT_ROOT} (uploads go to process.cwd()/static), not ${process.cwd()}`,
        );
    }
}

export interface TestApp {
    readonly app: NestExpressApplication;
    /** A supertest agent bound to the running application. */
    request(): ReturnType<typeof request>;
    /**
     * Registers a file the application created in static/ (given the
     * `imagePath` it returned) for deletion after the test file. Returns its
     * absolute path.
     */
    trackUpload(imagePath: string): string;
}

export interface TestAppOptions {
    /** Runs before the application boots, e.g. to create an existing database. */
    seedDatabase?: (databasePath: string) => void;
}

/**
 * Boots the real application (AppModule + configureApp, exactly as main.ts
 * does, minus `listen`) once for the calling test file and tears it down
 * afterwards. Call it at the top of a `describe` block.
 *
 * One application per test file: AppModule reads DATABASE_PATH on import, so
 * a second instance in the same file would share the same database.
 */
export function useTestApp(options: TestAppOptions = {}): TestApp {
    let app: NestExpressApplication | undefined;
    const preexistingStaticFiles = new Set<string>();
    const trackedUploads = new Set<string>();

    beforeAll(async () => {
        assertIsolated();
        fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
        options.seedDatabase?.(DATABASE_PATH);
        for (const name of fs.readdirSync(STATIC_DIR)) {
            preexistingStaticFiles.add(name);
        }

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleRef.createNestApplication<NestExpressApplication>();
        configureApp(app);
        await app.init();

        if (!fs.existsSync(DATABASE_PATH)) {
            throw new Error(
                `The application did not open ${DATABASE_PATH}; it may be using another database`,
            );
        }
    });

    afterAll(async () => {
        await app?.close();
        for (const file of trackedUploads) {
            fs.rmSync(file, { force: true });
        }
        fs.rmSync(path.dirname(DATABASE_PATH), {
            recursive: true,
            force: true,
        });
    });

    function getApp(): NestExpressApplication {
        if (app === undefined) {
            throw new Error("The test application has not been started");
        }
        return app;
    }

    return {
        get app() {
            return getApp();
        },
        request: () => request(getApp().getHttpServer()),
        trackUpload(imagePath: string): string {
            const name = path.posix.basename(imagePath);
            if (
                imagePath !== `/static/${name}` ||
                preexistingStaticFiles.has(name)
            ) {
                throw new Error(
                    `Not a file created by this test run: ${imagePath}`,
                );
            }
            const file = path.join(STATIC_DIR, name);
            trackedUploads.add(file);
            // Temporary output of the background compression step.
            if (!preexistingStaticFiles.has(`${name}.tmp`)) {
                trackedUploads.add(`${file}.tmp`);
            }
            return file;
        },
    };
}

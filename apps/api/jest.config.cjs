// Dates are persisted in UTC. Running the suite in a zone that is never equal
// to UTC makes any local-time/UTC mix-up in the driver or ORM show up as a
// failing test instead of passing by accident on a UTC machine.
process.env.TZ = "Asia/Kolkata";

/** @type {import("jest").Config} */
module.exports = {
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
    testTimeout: 15000,
    transform: {
        // tsconfig.test.json only adds `isolatedModules`, which ts-jest needs
        // to honour `module: nodenext`. Type checking is done by `tsc`.
        "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
    },
    // Sets the API keys and a per-file temporary DATABASE_PATH before the
    // test file (and therefore AppModule) is loaded.
    setupFiles: ["<rootDir>/test/support/env.ts"],
    // The app never loads the real TinyPNG client under test.
    moduleNameMapper: {
        "^tinify$": "<rootDir>/test/support/tinify-mock.ts",
    },
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
};

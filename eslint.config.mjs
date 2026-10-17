import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    globalIgnores(["**/dist/", "**/.angular/", "**/out-tsc/", "**/coverage/"]),
    {
        files: ["**/*.ts"],
        extends: [tseslint.configs.recommended],
    },
);

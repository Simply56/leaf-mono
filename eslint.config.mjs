import angular from "angular-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    globalIgnores(["**/dist/", "**/.angular/", "**/out-tsc/", "**/coverage/"]),
    {
        files: ["**/*.ts"],
        extends: [tseslint.configs.recommended],
    },
    {
        files: ["apps/web/src/**/*.ts"],
        extends: [angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
    },
    {
        files: ["apps/web/src/**/*.html"],
        extends: [
            angular.configs.templateRecommended,
            angular.configs.templateAccessibility,
        ],
        rules: {
            // `x != null` deliberately covers undefined as well (e.g. a
            // plant looked up with find()).
            "@angular-eslint/template/eqeqeq": [
                "error",
                { allowNullOrUndefined: true },
            ],
        },
    },
);

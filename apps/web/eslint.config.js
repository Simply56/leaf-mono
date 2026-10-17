// @ts-check
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {},
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);

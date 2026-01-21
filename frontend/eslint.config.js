import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.configs(
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        plugins: {
            js,
            "simple-import-sort": simpleImportSort,
        },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.browser },
        rules: {
            "react/react-in-jsx-scope": "off",
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
);

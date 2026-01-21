// https://vite.dev/config/

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
        alias: [
            { find: "@shared", replacement: path.resolve(__dirname, "src/shared") },
            { find: "@utils", replacement: path.resolve(__dirname, "src/utils") },
        ],
    },
});

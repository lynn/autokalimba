import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [preact()],
	// The build is published at foldr.moe/harp/beta, next to the original app.
	base: "./",
	build: {
		outDir: "../beta",
		emptyOutDir: true,
	},
});

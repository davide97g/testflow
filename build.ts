#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

const distDir = path.join(process.cwd(), "dist");

// Clean dist directory
if (existsSync(distDir)) {
  await rm(distDir, { recursive: true, force: true });
}

// Build init.ts first (it's run as a separate script)
await $`bun build ./src/init.ts --outdir ./dist --target bun --format esm --minify --external @inquirer/prompts --external axios --external chalk --external commander --external figlet --external fs-extra --external gradient-string --external ora --external zod`;

// Build CLI entry point (bundles commander and other dependencies)
await $`bun build ./src/cli.ts --outdir ./dist --target bun --format esm --minify --external @inquirer/prompts --external axios --external chalk --external commander --external figlet --external fs-extra --external gradient-string --external ora --external zod`;

// Build other source files that might be imported separately
await $`bun build ./src/config.ts --outdir ./dist --target bun --format esm --minify --external zod --external fs-extra`;
await $`bun build ./src/env.ts --outdir ./dist --target bun --format esm --minify --external zod`;

// Generate TypeScript declaration files
await $`tsc --emitDeclarationOnly`;

console.log("✅ Build complete!");

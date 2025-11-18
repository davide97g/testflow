#!/usr/bin/env bun

import { Command } from "commander";
import fs from "fs-extra";
import { existsSync } from "fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version || "1.0.0";

const program = new Command();

program
  .name("testflow")
  .description("Framework for testing and automation")
  .version(version);

const runNodeScript = (scriptPath: string, args: string[] = []): void => {
  // Use .js extension for built files, fallback to .ts for development
  const jsPath = scriptPath.replace(/\.ts$/, ".js");
  const fullPath = path.join(__dirname, jsPath);
  const tsPath = path.join(__dirname, scriptPath);
  
  // Try .js first (production), then .ts (development)
  const scriptToRun = existsSync(fullPath) ? fullPath : tsPath;
  
  const result = spawnSync("bun", [scriptToRun, ...args], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  if (result.error) {
    console.error(`Error running script: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== null && result.status !== 0) {
    process.exit(result.status);
  }
};

program
  .command("init")
  .description("Initialize testflow configuration")
  .action(() => {
    runNodeScript("./init.ts", process.argv.slice(3));
  });

program.parse(process.argv);

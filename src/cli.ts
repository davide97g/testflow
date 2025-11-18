#!/usr/bin/env node

import { Command } from "commander";
import { spawnSync } from "node:child_process";
import fs from "fs-extra";
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
  const fullPath = path.join(__dirname, scriptPath);
  const result = spawnSync("bun", [fullPath, ...args], {
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


#!/usr/bin/env bun

import { Command } from "commander";
import { existsSync } from "fs";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import all modules
export * from "./config.js";
export * from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version || "1.0.0";

const program = new Command();

program
  .name("testflow")
  .description("Framework for testing and automation")
  .version(version);

const runNodeScript = (scriptPath: string, args: string[] = []): void => {
  // Use .js extension for built files, fallback to .ts for development
  const jsPath = scriptPath.replace(/\.ts$/, ".js");
  const fullPath = path.join(__dirname, "..", jsPath);
  const tsPath = path.join(__dirname, "..", scriptPath);

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
    runNodeScript("./src/init.ts", process.argv.slice(3));
  });

program
  .command("extract")
  .description("Extract JIRA issue and PR changes")
  .argument(
    "[issueIdOrKey]",
    "JIRA issue ID or key (optional, will use interactive mode if not provided)"
  )
  .action((issueIdOrKey?: string) => {
    const args = issueIdOrKey ? [issueIdOrKey] : [];
    runNodeScript("./src/scripts/get-jira-issue.ts", args);
  });

program
  .command("extract:pr")
  .description("Extract PR changes")
  .argument("<prId>", "Pull request ID")
  .action((prId: string) => {
    runNodeScript("./src/scripts/get-pr-changes.ts", [prId]);
  });

program.parse(process.argv);

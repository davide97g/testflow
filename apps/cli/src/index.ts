#!/usr/bin/env bun

import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
  // Determine if we're running from dist (production) or src (development)
  const isDist =
    __dirname.includes("dist") || path.basename(__dirname) === "dist";

  let scriptToRun: string;

  if (isDist) {
    // Running from dist: scripts are in the same dist folder
    // Convert ./src/init.ts -> ./init.js
    const jsPath = scriptPath
      .replace(/^\.\/src\//, "./")
      .replace(/\.ts$/, ".js");
    scriptToRun = path.join(__dirname, jsPath);

    // Fallback: try without the ./ prefix
    if (!existsSync(scriptToRun)) {
      const altPath = path.join(__dirname, path.basename(jsPath));
      if (existsSync(altPath)) {
        scriptToRun = altPath;
      }
    }
  } else {
    // Running from src (development): use original path
    scriptToRun = path.join(__dirname, "..", scriptPath);
  }

  if (!existsSync(scriptToRun)) {
    console.error(`Error: Script not found at ${scriptToRun}`);
    process.exit(1);
  }

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

program
  .command("zephyr")
  .description("Retrieve Zephyr test cases for a project")
  .argument(
    "[projectKey]",
    "Zephyr project key (optional, will use config file or ZEPHYR_PROJECT_KEY env var if not provided)"
  )
  .action((projectKey?: string) => {
    const args = projectKey ? [projectKey] : [];
    runNodeScript("./src/scripts/get-zephyr-testcases.ts", args);
  });

const getMonorepoRoot = (): string => {
  return path.join(__dirname, "..", "..", "..");
};

program
  .command("e2e")
  .description("Run Playwright E2E tests from the monorepo root")
  .action(() => {
    const monorepoRoot = getMonorepoRoot();
    const result = spawnSync("bun", ["run", "e2e"], {
      stdio: "inherit",
      cwd: monorepoRoot,
    });
    if (result.error) {
      console.error(`Error running e2e: ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== null && result.status !== 0) {
      process.exit(result.status);
    }
  });

program.parse(process.argv);

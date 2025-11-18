#!/usr/bin/env node

import { input } from "@inquirer/prompts";
import chalk from "chalk";
import figlet from "figlet";
import fs from "fs-extra";
import gradient from "gradient-string";
import ora from "ora";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = ["#A4A5A7", "#C74600", "#EB640A", "#F2A65D"];
const dynamicGradient = gradient(colors);

interface Config {
  workspace: string;
  repo: string;
  jiraBaseUrl: string;
}

interface InitAnswers {
  workspace: string;
  repo: string;
  jiraBaseUrl: string;
}

interface PackageJson {
  name?: string;
  version?: string;
}

const runBanner = async (): Promise<void> => {
  return new Promise((resolve) => {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const version = packageJson.version || "1.0.0";

    figlet.text(
      "testflow",
      {
        font: "Slant",
        horizontalLayout: "default",
        verticalLayout: "default",
        width: 80,
      },
      (err, data) => {
        if (err) {
          console.error(chalk.red(`❌ Figlet error: ${err.message}`));
          return resolve();
        }

        const lines = data?.split("\n") ?? [];
        let i = 0;

        const interval = setInterval(() => {
          const shifted = [...colors.slice(i), ...colors.slice(0, i)];
          const dynamicGradient = gradient(shifted);
          console.clear();
          console.log(chalk.bold(dynamicGradient.multiline(lines.join("\n"))));
          console.log(chalk.bold(dynamicGradient.multiline(`v${version}\n`)));
          console.log(dynamicGradient("Framework for testing and automation\n"));
          i = (i + 1) % colors.length;
        }, 150);

        setTimeout(() => {
          clearInterval(interval);
          console.log("\n");
          resolve();
        }, 4000);
      }
    );
  });
};

const loadDefaults = async (): Promise<Partial<Config>> => {
  const defaults: Partial<Config> = {};

  // Try to read existing config.json
  const configPath = path.join(process.cwd(), "config.json");
  try {
    if (await fs.pathExists(configPath)) {
      const existingConfig = (await fs.readJson(configPath)) as Config;
      defaults.workspace = existingConfig.workspace;
      defaults.repo = existingConfig.repo;
      defaults.jiraBaseUrl = existingConfig.jiraBaseUrl;
    }
  } catch (error) {
    // Ignore errors reading config
  }

  // Try to read package.json for repo name
  const pkgPath = path.join(process.cwd(), "package.json");
  try {
    if (await fs.pathExists(pkgPath)) {
      const pkg = (await fs.readJson(pkgPath)) as PackageJson;
      if (pkg.name && !defaults.repo) {
        defaults.repo = pkg.name.trim();
      }
    }
  } catch (error) {
    // Ignore errors reading package.json
  }

  // Default repo name from current directory if not found
  if (!defaults.repo) {
    defaults.repo = path.basename(process.cwd());
  }

  return defaults;
};

const collectAnswers = async (defaults: Partial<Config>): Promise<InitAnswers> => {
  const workspace = await input({
    message: "Bitbucket workspace:",
    default: defaults.workspace || "",
    validate: (val: string) => {
      const trimmed = (val ?? "").trim();
      return trimmed ? true : "Workspace is required";
    },
  });

  const repo = await input({
    message: "Bitbucket repository:",
    default: defaults.repo || "",
    validate: (val: string) => {
      const trimmed = (val ?? "").trim();
      return trimmed ? true : "Repository name is required";
    },
  });

  const jiraBaseUrl = await input({
    message: "JIRA base URL:",
    default: defaults.jiraBaseUrl || "https://your-domain.atlassian.net",
    validate: (val: string) => {
      const trimmed = (val ?? "").trim();
      if (!trimmed) {
        return "JIRA base URL is required";
      }
      try {
        const url = new URL(trimmed);
        if (!url.protocol.startsWith("http")) {
          return "JIRA base URL must be a valid HTTP/HTTPS URL";
        }
        return true;
      } catch {
        return "JIRA base URL must be a valid URL";
      }
    },
  });

  return {
    workspace: workspace.trim(),
    repo: repo.trim(),
    jiraBaseUrl: jiraBaseUrl.trim(),
  };
};

const writeConfig = async (answers: InitAnswers): Promise<void> => {
  const configSpinner = ora({
    text: "Writing configuration…",
    color: "yellow",
  }).start();

  try {
    const configPath = path.join(process.cwd(), "config.json");
    const config: Config = {
      workspace: answers.workspace,
      repo: answers.repo,
      jiraBaseUrl: answers.jiraBaseUrl,
    };

    await fs.writeJson(configPath, config, { spaces: 2 });
    configSpinner.succeed(
      `Configuration saved to ${path.relative(process.cwd(), configPath)}`
    );
  } catch (error) {
    configSpinner.fail("Failed to write configuration");
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
};

const handleGracefulExit = (error: unknown): void => {
  if (
    error &&
    typeof error === "object" &&
    (("name" in error && error.name === "ExitPromptError") ||
      ("message" in error &&
        typeof error.message === "string" &&
        error.message.includes("SIGINT")))
  ) {
    console.log("\n");
    console.log(
      dynamicGradient.multiline(
        "👋 Setup cancelled\nThanks for trying testflow!\nSee you next time ✨"
      )
    );
    process.exit(0);
  }
};

const runInit = async (): Promise<void> => {
  // 1. Welcome message
  console.log(dynamicGradient("Welcome to testflow setup!\n"));

  // 2. Load defaults
  const defaults = await loadDefaults();

  // 3. Collect user input
  let answers: InitAnswers;

  try {
    answers = await collectAnswers(defaults);
  } catch (error) {
    handleGracefulExit(error);
    throw error;
  }

  // 4. Write configuration file
  await writeConfig(answers);

  // 5. Success message
  console.log("\n");
  console.log(dynamicGradient("✅ Setup complete."));
  console.log(chalk.gray("\nYou can now use testflow commands to extract JIRA issues and PR changes."));
};

// Run banner and init
await runBanner();
await runInit().catch((error) => {
  console.error(chalk.red("\n❌ An unexpected error occurred:"));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});


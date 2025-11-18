#!/usr/bin/env node

import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ora from "ora";
import { type Config, loadConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = ["#A4A5A7", "#C74600", "#EB640A", "#F2A65D"];
const dynamicGradient = gradient(colors);

interface InitAnswers {
  workspace: string;
  repo: string;
  jiraBaseUrl: string;
  boardId?: number;
  assignee?: string;
  statuses?: string[];
}

interface PackageJson {
  name?: string;
  version?: string;
}

const runBanner = async (): Promise<void> => {
  return new Promise((resolve) => {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
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
          console.error(chalk.red(`Figlet error: ${err.message}`));
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
          console.log(
            dynamicGradient("Framework for testing and automation\n")
          );
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

const loadDefaults = async (): Promise<Partial<InitAnswers>> => {
  const defaults: Partial<InitAnswers> = {};

  // Try to read existing config.json
  try {
    const existingConfig = await loadConfig();
    defaults.workspace = existingConfig.bitbucket.workspace;
    defaults.repo = existingConfig.bitbucket.repo;
    defaults.jiraBaseUrl = existingConfig.jira.baseUrl;
    defaults.boardId = existingConfig.jira.boardId;
    defaults.assignee = existingConfig.jira.assignee;
    defaults.statuses = existingConfig.jira.statuses;
  } catch (error) {
    // Ignore errors reading config (file might not exist yet)
  }

  // Try to read package.json for repo name
  const pkgPath = path.join(process.cwd(), "package.json");
  try {
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;
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

const collectAnswers = async (
  defaults: Partial<InitAnswers>
): Promise<InitAnswers> => {
  console.log(chalk.cyan("\n📦 Bitbucket Configuration"));
  console.log(chalk.gray("─".repeat(40)));

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

  console.log(chalk.cyan("\n🎯 Jira Configuration"));
  console.log(chalk.gray("─".repeat(40)));

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

  // Optional: Board ID
  const useBoardId = await confirm({
    message: "Do you want to filter by a specific board?",
    default: defaults.boardId !== undefined,
  });

  let boardId: number | undefined;
  if (useBoardId) {
    const boardIdStr = await input({
      message: "Enter board ID:",
      default: defaults.boardId?.toString() || "",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        if (!trimmed) {
          return "Board ID is required";
        }
        const parsed = parseInt(trimmed, 10);
        if (isNaN(parsed)) {
          return "Board ID must be a valid number";
        }
        return true;
      },
    });
    boardId = parseInt(boardIdStr, 10);
  }

  // Optional: Assignee
  const useAssignee = await confirm({
    message: "Do you want to filter by assignee?",
    default: defaults.assignee !== undefined,
  });

  let assignee: string | undefined;
  if (useAssignee) {
    assignee = await input({
      message: "Enter assignee (username or email):",
      default: defaults.assignee || "",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        return trimmed ? true : "Assignee is required";
      },
    });
  }

  // Optional: Statuses
  const useStatuses = await confirm({
    message: "Do you want to configure default statuses?",
    default: defaults.statuses !== undefined && defaults.statuses.length > 0,
  });

  let statuses: string[] | undefined;
  if (useStatuses) {
    const statusesInput = await input({
      message:
        "Enter statuses (comma-separated, e.g., 'To Do,In Progress,Pull Requested'):",
      default:
        defaults.statuses?.join(", ") ||
        "To Do,In Progress,Pull Requested,Dev Release",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        if (!trimmed) {
          return "At least one status is required";
        }
        const parsed = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsed.length === 0) {
          return "At least one status is required";
        }
        return true;
      },
    });
    statuses = statusesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    workspace: workspace.trim(),
    repo: repo.trim(),
    jiraBaseUrl: jiraBaseUrl.trim(),
    boardId,
    assignee: assignee?.trim(),
    statuses,
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
      bitbucket: {
        workspace: answers.workspace,
        repo: answers.repo,
      },
      jira: {
        baseUrl: answers.jiraBaseUrl,
        ...(answers.boardId !== undefined && { boardId: answers.boardId }),
        ...(answers.assignee && { assignee: answers.assignee }),
        ...(answers.statuses &&
          answers.statuses.length > 0 && { statuses: answers.statuses }),
      },
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    configSpinner.succeed(
      `Configuration saved to ${path.relative(process.cwd(), configPath)}`
    );
  } catch (error) {
    configSpinner.fail("Failed to write configuration");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
};

const getEditorConfig = (
  editor: string
): { filePath: string; fileName: string } => {
  const cwd = process.cwd();

  switch (editor) {
    case "Cursor":
      return {
        filePath: cwd,
        fileName: ".cursorrules",
      };
    case "GitHub Copilot":
      return {
        filePath: path.join(cwd, ".github"),
        fileName: "copilot-instructions.md",
      };
    case "Codeium":
      return {
        filePath: path.join(cwd, ".codeium"),
        fileName: "instructions.md",
      };
    case "Other":
      return {
        filePath: cwd,
        fileName: "testflow.mdc",
      };
    default:
      return {
        filePath: cwd,
        fileName: "testflow.mdc",
      };
  }
};

const createEditorRule = async (): Promise<void> => {
  const shouldCreateRule = await confirm({
    message: "Do you want to create an AI editor rule file?",
    default: true,
  });

  if (!shouldCreateRule) {
    return;
  }

  console.log(chalk.cyan("\n🤖 AI Editor Configuration"));
  console.log(chalk.gray("─".repeat(40)));

  const editor = await select({
    message: "Which AI Editor are you using?",
    choices: [
      { name: "Cursor", value: "Cursor" },
      { name: "GitHub Copilot", value: "GitHub Copilot" },
      { name: "Codeium", value: "Codeium" },
      { name: "Other", value: "Other" },
    ],
  });

  const { filePath, fileName } = getEditorConfig(editor);
  const ruleFilePath = path.join(filePath, fileName);

  // Read the prompt file - try multiple possible locations
  // 1. In dist folder (when running from installed package - same dir as init.js)
  // 2. In prompts folder (when running from source)
  let promptContent: string;
  const distPromptPath = path.join(__dirname, "llm-prompt.md"); // dist/llm-prompt.md (installed package)
  const sourcePromptPath = path.join(__dirname, "prompts", "llm-prompt.md"); // prompts/llm-prompt.md (source)

  let foundPath: string | null = null;
  if (existsSync(distPromptPath)) {
    foundPath = distPromptPath;
  } else if (existsSync(sourcePromptPath)) {
    foundPath = sourcePromptPath;
  }

  if (!foundPath) {
    console.error(chalk.red("Could not find llm-prompt.md file"));
    console.error(chalk.gray(`Tried: ${distPromptPath}`));
    console.error(chalk.gray(`Tried: ${sourcePromptPath}`));
    return;
  }

  promptContent = readFileSync(foundPath, "utf-8");

  const ruleSpinner = ora({
    text: `Creating ${fileName}...`,
    color: "yellow",
  }).start();

  try {
    // Ensure directory exists
    mkdirSync(filePath, { recursive: true });

    // Write the rule file
    writeFileSync(ruleFilePath, promptContent, "utf-8");

    ruleSpinner.succeed(
      `${fileName} created at ${path.relative(process.cwd(), ruleFilePath)}`
    );
  } catch (error) {
    ruleSpinner.fail(`Failed to create ${fileName}`);
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
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

  // 5. Create AI editor rule file
  await createEditorRule();

  // 6. Success message
  console.log("\n");
  console.log(dynamicGradient("Setup complete."));
  console.log(
    chalk.gray(
      "\nYou can now use testflow commands to extract JIRA issues and PR changes."
    )
  );
};

// Run banner and init
await runBanner();
await runInit().catch((error) => {
  console.error(chalk.red("\nAn unexpected error occurred:"));
  console.error(
    chalk.red(error instanceof Error ? error.message : String(error))
  );
  process.exit(1);
});

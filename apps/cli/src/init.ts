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
  workspace?: string;
  repo?: string;
  jiraBaseUrl: string;
  boardId?: number;
  assignee?: string;
  statuses?: string[];
  confluenceBaseUrl?: string;
  zephyrProjectKey?: string;
  zephyrProjectId?: string;
  zephyrFolderId?: string;
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
    defaults.workspace = existingConfig.bitbucket?.workspace;
    defaults.repo = existingConfig.bitbucket?.repo;
    defaults.jiraBaseUrl = existingConfig.jira.baseUrl;
    defaults.boardId = existingConfig.jira.boardId;
    defaults.assignee = existingConfig.jira.assignee;
    defaults.statuses = existingConfig.jira.statuses;
    defaults.confluenceBaseUrl = existingConfig.confluence?.baseUrl;
    defaults.zephyrProjectKey = existingConfig.zephyr?.projectKey;
    defaults.zephyrProjectId =
      existingConfig.zephyr?.projectId?.toString() || undefined;
    defaults.zephyrFolderId = existingConfig.zephyr?.folderId;
  } catch (error) {
    // Ignore errors reading config (file might not exist yet)
    // Only log errors that are not about missing config file
    if (
      error instanceof Error &&
      !error.message.includes("Configuration file not found")
    ) {
      console.error(chalk.red(`Error loading config: ${error}`));
    }
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
    console.error(chalk.red(`Error reading package.json: ${error}`));
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

  // Optional: Bitbucket configuration
  const useBitbucket = await confirm({
    message: "Do you want to configure Bitbucket integration?",
    default: defaults.workspace !== undefined && defaults.repo !== undefined,
  });

  let workspace: string | undefined;
  let repo: string | undefined;

  if (useBitbucket) {
    workspace = await input({
      message: "Bitbucket workspace:",
      default: defaults.workspace || "",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        return trimmed ? true : "Workspace is required";
      },
    });

    repo = await input({
      message: "Bitbucket repository:",
      default: defaults.repo || "",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        return trimmed ? true : "Repository name is required";
      },
    });
  }

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
        if (Number.isNaN(parsed)) {
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

  console.log(chalk.cyan("\n📚 Confluence Configuration"));
  console.log(chalk.gray("─".repeat(40)));

  // Optional: Confluence base URL
  const useConfluence = await confirm({
    message: "Do you want to configure Confluence integration?",
    default: defaults.confluenceBaseUrl !== undefined,
  });

  let confluenceBaseUrl: string | undefined;
  if (useConfluence) {
    // Default to Jira base URL if not set
    const defaultConfluenceUrl =
      defaults.confluenceBaseUrl || jiraBaseUrl.trim();
    confluenceBaseUrl = await input({
      message: "Confluence base URL:",
      default: defaultConfluenceUrl,
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        if (!trimmed) {
          return "Confluence base URL is required";
        }
        try {
          const url = new URL(trimmed);
          if (!url.protocol.startsWith("http")) {
            return "Confluence base URL must be a valid HTTP/HTTPS URL";
          }
          return true;
        } catch {
          return "Confluence base URL must be a valid URL";
        }
      },
    });
  }

  console.log(chalk.cyan("\n🧪 Zephyr Configuration"));
  console.log(chalk.gray("─".repeat(40)));

  // Optional: Zephyr configuration
  const useZephyr = await confirm({
    message: "Do you want to configure Zephyr integration?",
    default: defaults.zephyrProjectKey !== undefined,
  });

  let zephyrProjectKey: string | undefined;
  let zephyrProjectId: string | undefined;
  let zephyrFolderId: string | undefined;

  if (useZephyr) {
    zephyrProjectKey = await input({
      message: "Zephyr project key:",
      default: defaults.zephyrProjectKey || "",
      validate: (val: string) => {
        const trimmed = (val ?? "").trim();
        return trimmed ? true : "Zephyr project key is required";
      },
    });

    const useProjectId = await confirm({
      message: "Do you want to configure Zephyr project ID?",
      default: defaults.zephyrProjectId !== undefined,
    });

    if (useProjectId) {
      zephyrProjectId = await input({
        message: "Zephyr project ID:",
        default: defaults.zephyrProjectId || "",
        validate: (val: string) => {
          const trimmed = (val ?? "").trim();
          return trimmed ? true : "Zephyr project ID is required";
        },
      });
    }

    const useFolderId = await confirm({
      message: "Do you want to configure Zephyr folder ID?",
      default: defaults.zephyrFolderId !== undefined,
    });

    if (useFolderId) {
      zephyrFolderId = await input({
        message: "Zephyr folder ID:",
        default: defaults.zephyrFolderId || "",
        validate: (val: string) => {
          const trimmed = (val ?? "").trim();
          return trimmed ? true : "Zephyr folder ID is required";
        },
      });
    }
  }

  return {
    workspace: workspace?.trim(),
    repo: repo?.trim(),
    jiraBaseUrl: jiraBaseUrl.trim(),
    boardId,
    assignee: assignee?.trim(),
    statuses,
    confluenceBaseUrl: confluenceBaseUrl?.trim(),
    zephyrProjectKey: zephyrProjectKey?.trim(),
    zephyrProjectId: zephyrProjectId?.trim(),
    zephyrFolderId: zephyrFolderId?.trim(),
  };
};

const writeConfig = async (answers: InitAnswers): Promise<void> => {
  const configSpinner = ora({
    text: "Writing configuration…",
    color: "yellow",
  }).start();

  try {
    // Create .testflow directory if it doesn't exist
    const testflowDir = path.join(process.cwd(), ".testflow");
    mkdirSync(testflowDir, { recursive: true });

    const configPath = path.join(testflowDir, "config.json");
    const config: Config = {
      ...(answers.workspace &&
        answers.repo && {
          bitbucket: {
            workspace: answers.workspace,
            repo: answers.repo,
          },
        }),
      jira: {
        baseUrl: answers.jiraBaseUrl,
        ...(answers.boardId !== undefined && { boardId: answers.boardId }),
        ...(answers.assignee && { assignee: answers.assignee }),
        ...(answers.statuses &&
          answers.statuses.length > 0 && { statuses: answers.statuses }),
      },
      ...(answers.confluenceBaseUrl && {
        confluence: {
          baseUrl: answers.confluenceBaseUrl,
        },
      }),
      ...(answers.zephyrProjectKey && {
        zephyr: {
          projectKey: answers.zephyrProjectKey,
          ...(answers.zephyrProjectId && {
            projectId: answers.zephyrProjectId,
          }),
          ...(answers.zephyrFolderId && { folderId: answers.zephyrFolderId }),
        },
      }),
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

const updateGitignore = async (): Promise<void> => {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const testflowEntry = ".testflow/";

  try {
    let gitignoreContent = "";
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, "utf-8");
    }

    // Check if .testflow/ is already in .gitignore
    if (gitignoreContent.includes(testflowEntry)) {
      return; // Already exists, no need to add
    }

    // Remove old entries if they exist
    gitignoreContent = gitignoreContent
      .replace(/^output\/\s*$/gm, "")
      .replace(/^config\.json\s*$/gm, "")
      .replace(/^\*\.log\s*$/gm, "");

    // Add .testflow/ entry
    if (gitignoreContent && !gitignoreContent.endsWith("\n")) {
      gitignoreContent += "\n";
    }
    gitignoreContent += `# testflow\n${testflowEntry}\n`;

    writeFileSync(gitignorePath, gitignoreContent, "utf-8");
    console.log(chalk.gray(`Updated .gitignore to include ${testflowEntry}`));
  } catch (error) {
    console.error(chalk.red(`Error updating .gitignore: ${error}`));
    // Silently fail if .gitignore doesn't exist or can't be written
    // This is not critical for the init process
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
  // 1. In prompts folder at project root (when running from dist or src)
  // 2. In dist/prompts folder (when running from compiled dist - after build)
  let promptContent: string;
  const rootPromptPath = path.join(__dirname, "..", "prompts", "llm-prompt.md"); // prompts/llm-prompt.md (project root)
  const distPromptPath = path.join(__dirname, "prompts", "llm-prompt.md"); // dist/prompts/llm-prompt.md (compiled)

  let foundPath: string | null = null;
  if (existsSync(rootPromptPath)) {
    foundPath = rootPromptPath;
  } else if (existsSync(distPromptPath)) {
    foundPath = distPromptPath;
  }

  if (!foundPath) {
    console.error(chalk.red("Could not find llm-prompt.md file"));
    console.error(chalk.gray(`Tried: ${rootPromptPath}`));
    console.error(chalk.gray(`Tried: ${distPromptPath}`));
    return;
  }

  promptContent = readFileSync(foundPath, "utf-8");

  const ruleSpinner = ora({
    text: `Creating ${fileName}...`,
    color: "yellow",
  }).start();

  try {
    // Ensure directory exists
    if (filePath !== process.cwd()) {
      mkdirSync(filePath, { recursive: true });
    }

    // Write the rule file
    writeFileSync(ruleFilePath, promptContent, "utf-8");

    ruleSpinner.succeed(
      `${fileName} created at ${path.relative(process.cwd(), ruleFilePath)}`
    );
  } catch (error) {
    ruleSpinner.fail(`Failed to create ${fileName}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    console.error(chalk.gray(`Attempted to write to: ${ruleFilePath}`));
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }
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

  // 5. Update .gitignore to include .testflow/
  await updateGitignore();

  // 6. Create AI editor rule file
  await createEditorRule();

  // 7. Success message
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

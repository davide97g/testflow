import axios from "axios";
import chalk from "chalk";
import { appendFileSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ora from "ora";
import { loadEnvWithWarnings } from "../env.js";

// Helper function to convert absolute path to relative path
const getRelativePath = (absolutePath: string): string => {
  const relativePath = relative(process.cwd(), absolutePath);
  return relativePath.startsWith("..")
    ? absolutePath
    : `/${relativePath.replace(/\\/g, "/")}`;
};

// Load and validate environment variables (shows warnings instead of errors)
loadEnvWithWarnings([
  "ZEPHYR_PROJECT_KEY",
  "ZEPHYR_BASE_URL",
  "ZEPHYR_ACCESS_TOKEN",
  "ZEPHYR_FOLDER_ID",
]);

// Access environment variables directly
const ZEPHYR_PROJECT_KEY = process.env.ZEPHYR_PROJECT_KEY;
const ZEPHYR_BASE_URL = process.env.ZEPHYR_BASE_URL;
const ZEPHYR_ACCESS_TOKEN = process.env.ZEPHYR_ACCESS_TOKEN;
const ZEPHYR_FOLDER_ID = process.env.ZEPHYR_FOLDER_ID;

const logError = (error: unknown, context: string) => {
  const testflowDir = join(process.cwd(), ".testflow");
  mkdirSync(testflowDir, { recursive: true });
  const logPath = join(testflowDir, "testflow.log");
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    context,
    error:
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : String(error),
    axiosError: axios.isAxiosError(error)
      ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
        }
      : undefined,
  };

  const logEntry = `\n[${timestamp}] ${context}\n${JSON.stringify(
    errorDetails,
    null,
    2
  )}\n`;
  appendFileSync(logPath, logEntry, "utf-8");
};

interface ZephyrTestCase {
  id?: number;
  key?: string;
  name?: string;
  projectKey?: string;
  status?: {
    id?: number;
    name?: string;
  };
  priority?: {
    id?: number;
    name?: string;
  };
  type?: {
    id?: number;
    name?: string;
  };
  createdOn?: string;
  updatedOn?: string;
  [key: string]: unknown;
}

interface ZephyrTestCasesResponse {
  values?: ZephyrTestCase[];
  maxResults?: number;
  startAt?: number;
  total?: number;
  isLast?: boolean;
}

interface GetZephyrTestCasesParams {
  projectKey: string;
  folderId?: string;
}

/**
 * Fetch all test cases for a specific Zephyr project
 * Handles pagination automatically
 */
export const getZephyrTestCases = async ({
  projectKey,
  folderId,
}: GetZephyrTestCasesParams): Promise<ZephyrTestCase[]> => {
  if (!ZEPHYR_BASE_URL || !ZEPHYR_ACCESS_TOKEN) {
    throw new Error(
      "ZEPHYR_BASE_URL and ZEPHYR_ACCESS_TOKEN are required. Please check your environment variables."
    );
  }

  // Normalize base URL - remove trailing slashes
  let normalizedBaseUrl = ZEPHYR_BASE_URL.trim().replace(/\/+$/, "");
  // Remove any existing /v2 path if present (we'll add it)
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/v2$/, "");

  // Ensure we have /v2 in the path
  if (!normalizedBaseUrl.endsWith("/v2")) {
    normalizedBaseUrl = `${normalizedBaseUrl}/v2`;
  }

  const headers = {
    Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
    Accept: "application/json",
  };

  const allTestCases: ZephyrTestCase[] = [];
  let startAt = 0;
  const maxResults = 50; // Zephyr API default maxResults
  let hasMore = true;

  const spinner = ora({
    text: `Fetching test cases for project ${projectKey}`,
    color: "white",
  }).start();

  try {
    while (hasMore) {
      let url = `${normalizedBaseUrl}/testcases?projectKey=${encodeURIComponent(
        projectKey
      )}&startAt=${startAt}&maxResults=${maxResults}`;

      // Add folderId filter if provided
      if (folderId) {
        url += `&folderId=${encodeURIComponent(folderId)}`;
      }

      const response = await axios.get<ZephyrTestCasesResponse>(url, {
        headers,
      });

      const data = response.data;

      if (data.values && data.values.length > 0) {
        allTestCases.push(...data.values);
        spinner.text = `Fetched ${allTestCases.length} test cases${
          data.total ? ` / ${data.total}` : ""
        }`;
      }

      // Check if there are more results
      if (data.isLast || !data.values || data.values.length < maxResults) {
        hasMore = false;
      } else {
        startAt += maxResults;
      }
    }

    spinner.succeed(
      `Fetched ${allTestCases.length} test case${
        allTestCases.length !== 1 ? "s" : ""
      } for project ${projectKey}`
    );
    return allTestCases;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        logError(
          error,
          `Authentication failed for Zephyr project ${projectKey}`
        );
        spinner.fail(chalk.red("Authentication failed"));
        console.error(
          chalk.red(
            "Authentication failed. Please check your ZEPHYR_ACCESS_TOKEN."
          )
        );
        process.exit(1);
      } else if (error.response?.status === 403) {
        logError(error, `Access forbidden for Zephyr project ${projectKey}`);
        spinner.fail(chalk.red("Access forbidden"));
        console.error(
          chalk.red("Access forbidden. Please check your Zephyr permissions.")
        );
        process.exit(1);
      } else if (error.response?.status === 404) {
        logError(error, `Zephyr project ${projectKey} not found`);
        spinner.fail(chalk.yellow(`Project ${projectKey} not found`));
        console.error(
          chalk.yellow(
            `Project ${projectKey} not found. Please check your ZEPHYR_PROJECT_KEY.`
          )
        );
        process.exit(1);
      } else {
        logError(
          error,
          `Failed to fetch test cases for Zephyr project ${projectKey}`
        );
        spinner.fail(
          chalk.red(`Failed to fetch test cases for project ${projectKey}`)
        );
        console.error(chalk.red("Failed to fetch test cases"));
        process.exit(1);
      }
    } else {
      logError(
        error,
        `Failed to fetch test cases for Zephyr project ${projectKey}`
      );
      spinner.fail(
        chalk.red(`Failed to fetch test cases for project ${projectKey}`)
      );
      console.error(chalk.red("Failed to fetch test cases"));
      process.exit(1);
    }
    return [];
  }
};

/**
 * Process and save Zephyr test cases
 */
const processTestCases = async (projectKey: string, folderId?: string) => {
  try {
    const testCases = await getZephyrTestCases({ projectKey, folderId });

    if (testCases.length === 0) {
      console.log(
        chalk.yellow(`No test cases found for project ${projectKey}`)
      );
      return;
    }

    // Create output directory if it doesn't exist
    const outputDir = join(
      process.cwd(),
      ".testflow",
      "output",
      `zephyr-${projectKey}`
    );
    mkdirSync(outputDir, { recursive: true });

    // Create raw subdirectory for JSON files
    const rawDir = join(outputDir, "raw");
    mkdirSync(rawDir, { recursive: true });

    // Save JSON file with test cases data
    const saveSpinner = ora({
      text: `Saving test cases data to output directory`,
      color: "white",
    }).start();
    const jsonPath = join(rawDir, "zephyr-testcases.json");
    // Delete only the specific file if it exists
    try {
      unlinkSync(jsonPath);
    } catch {
      // File doesn't exist, which is fine
    }
    writeFileSync(jsonPath, JSON.stringify(testCases, null, 2), "utf-8");
    saveSpinner.succeed(
      `Test cases data saved to: ${getRelativePath(jsonPath)}`
    );

    // Create a compact text summary
    const compactSpinner = ora({
      text: `Creating compact test cases summary`,
      color: "white",
    }).start();
    const compactPath = join(outputDir, "zephyr-testcases-summary.txt");
    const summaryLines: string[] = [];

    summaryLines.push(`Zephyr Test Cases for Project: ${projectKey}`);
    summaryLines.push(`Total Test Cases: ${testCases.length}`);
    summaryLines.push("");
    summaryLines.push("=".repeat(80));
    summaryLines.push("");

    testCases.forEach((testCase, index) => {
      summaryLines.push(
        `${index + 1}. ${testCase.key || "N/A"}: ${testCase.name || "Untitled"}`
      );
      if (testCase.status?.name) {
        summaryLines.push(`   Status: ${testCase.status.name}`);
      }
      if (testCase.priority?.name) {
        summaryLines.push(`   Priority: ${testCase.priority.name}`);
      }
      if (testCase.type?.name) {
        summaryLines.push(`   Type: ${testCase.type.name}`);
      }
      if (testCase.createdOn) {
        summaryLines.push(`   Created: ${testCase.createdOn}`);
      }
      if (testCase.updatedOn) {
        summaryLines.push(`   Updated: ${testCase.updatedOn}`);
      }
      summaryLines.push("");
    });

    writeFileSync(compactPath, summaryLines.join("\n"), "utf-8");
    compactSpinner.succeed(
      `Test cases summary saved to: ${getRelativePath(compactPath)}`
    );

    console.log(
      chalk.green(
        `\n✅ Successfully retrieved and saved ${testCases.length} test case${
          testCases.length !== 1 ? "s" : ""
        } for project ${projectKey}`
      )
    );
  } catch (error) {
    logError(
      error,
      `Failed to process Zephyr test cases for project ${projectKey}`
    );
    console.error(chalk.red("Failed to process test cases"));
    process.exit(1);
  }
};

// Main execution
// Usage: bun run get-zephyr-testcases.ts [projectKey]
// Example: bun run get-zephyr-testcases.ts PROJ
const main = async () => {
  // Get project ID from command line arguments or environment variable
  const projectKey = process.argv[2] || ZEPHYR_PROJECT_KEY;
  // Get folder ID from environment variable (optional)
  const folderId = ZEPHYR_FOLDER_ID;

  if (!projectKey) {
    console.error(
      chalk.red(
        "Error: Project ID is required.\n" +
          "Usage: bun run get-zephyr-testcases.ts <projectKey>\n" +
          "Or set ZEPHYR_PROJECT_KEY environment variable."
      )
    );
    process.exit(1);
  }

  if (!ZEPHYR_BASE_URL || !ZEPHYR_ACCESS_TOKEN) {
    console.error(
      chalk.red(
        "Error: ZEPHYR_BASE_URL and ZEPHYR_ACCESS_TOKEN are required.\n" +
          "Please set these environment variables in your .env file."
      )
    );
    process.exit(1);
  }

  await processTestCases(projectKey, folderId);
};

main();

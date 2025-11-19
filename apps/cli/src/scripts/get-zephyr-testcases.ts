import axios from "axios";
import chalk from "chalk";
import { appendFileSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ora from "ora";
import { loadConfigSync } from "../config.js";
import { loadEnvWithWarnings } from "../env.js";
import type {
  DetailedTestCase,
  GetZephyrTestCasesParams,
  ZephyrExecution,
  ZephyrExecutionsResponse,
  ZephyrTestCase,
  ZephyrTestCasesResponse,
  ZephyrTestStep,
  ZephyrTestStepsResponse,
} from "./zephyr-types.js";

// Helper function to convert absolute path to relative path
const getRelativePath = (absolutePath: string): string => {
  const relativePath = relative(process.cwd(), absolutePath);
  return relativePath.startsWith("..")
    ? absolutePath
    : `/${relativePath.replace(/\\/g, "/")}`;
};

// Load and validate environment variables (shows warnings instead of errors)
loadEnvWithWarnings([
  "ZEPHYR_BASE_URL",
  "ZEPHYR_ACCESS_TOKEN",
  "ZEPHYR_CONNECT_BASE_URL",
]);

// Try to load config, fallback to environment variables
let configZephyrProjectKey: string | undefined;
let configZephyrProjectId: string | number | undefined;
let configZephyrFolderId: string | undefined;

try {
  const config = loadConfigSync();
  if (config.zephyr) {
    configZephyrProjectKey = config.zephyr.projectKey;
    configZephyrProjectId = config.zephyr.projectId;
    configZephyrFolderId = config.zephyr.folderId;
  }
} catch {
  // Config file doesn't exist or couldn't be loaded, use env vars only
}

// Access environment variables directly (used as fallback)
const ZEPHYR_PROJECT_KEY =
  configZephyrProjectKey || process.env.ZEPHYR_PROJECT_KEY;
const ZEPHYR_BASE_URL = process.env.ZEPHYR_BASE_URL;
const ZEPHYR_ACCESS_TOKEN = process.env.ZEPHYR_ACCESS_TOKEN;
const ZEPHYR_FOLDER_ID = configZephyrFolderId || process.env.ZEPHYR_FOLDER_ID;
const ZEPHYR_PROJECT_ID =
  configZephyrProjectId || process.env.ZEPHYR_PROJECT_ID;
const ZEPHYR_CONNECT_BASE_URL = process.env.ZEPHYR_CONNECT_BASE_URL;

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

/**
 * Get base URL for Zephyr Connect API v2 (for detailed endpoints like teststeps, links, executions)
 */
const getZephyrConnectV2BaseUrl = (): string => {
  if (!ZEPHYR_CONNECT_BASE_URL) {
    throw new Error(
      "ZEPHYR_CONNECT_BASE_URL is required for fetching detailed test case information"
    );
  }
  let baseUrl = ZEPHYR_CONNECT_BASE_URL.trim().replace(/\/+$/, "");

  // Ensure we have /v2 in the path
  if (!baseUrl.endsWith("/v2")) {
    // Remove any existing /v2 path if present (we'll add it)
    baseUrl = baseUrl.replace(/\/v2$/, "");
    // Ensure we have /v2 in the path
    baseUrl = `${baseUrl}/v2`;
  }

  return baseUrl;
};

/**
 * Get test steps for a test case
 *
 * cURL example:
 * curl -X GET \
 *   'https://prod-play.zephyr4jiracloud.com/connect/v2/testcases/{testCaseKey}/teststeps' \
 *   -H 'Authorization: Bearer YOUR_TOKEN' \
 *   -H 'Accept: application/json'
 */
const getTestSteps = async (testCaseKey: string): Promise<ZephyrTestStep[]> => {
  if (!ZEPHYR_CONNECT_BASE_URL || !ZEPHYR_ACCESS_TOKEN || !testCaseKey) {
    return [];
  }

  try {
    const baseUrl = getZephyrConnectV2BaseUrl();
    const headers = {
      Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
      Accept: "application/json",
    };

    // Use v2 API endpoint: /v2/testcases/{testCaseKey}/teststeps
    const url = `${baseUrl}/testcases/${testCaseKey}/teststeps`;
    const response = await axios.get<ZephyrTestStepsResponse>(url, {
      headers,
    });

    if (response.data.values) {
      return response.data.values;
    }

    // Fallback: check if response is directly an array
    if (Array.isArray(response.data)) {
      return response.data as ZephyrTestStep[];
    }

    return [];
  } catch (error) {
    // Log but don't fail - some test cases might not have steps
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      logError(
        error,
        `Failed to fetch test steps for test case ${testCaseKey}`
      );
    }
    return [];
  }
};

/**
 * Get executions for a test case
 *
 * cURL example:
 * curl -X GET \
 *   'https://prod-play.zephyr4jiracloud.com/connect/v2/executions?testCaseKey={testCaseKey}&projectId={projectId}&maxResults=50&startAt=0' \
 *   -H 'Authorization: Bearer YOUR_TOKEN' \
 *   -H 'Accept: application/json'
 */
const getExecutions = async (
  testCaseKey: string,
  projectId?: string | number
): Promise<ZephyrExecution[]> => {
  if (!ZEPHYR_CONNECT_BASE_URL || !ZEPHYR_ACCESS_TOKEN || !testCaseKey) {
    return [];
  }

  try {
    const baseUrl = getZephyrConnectV2BaseUrl();
    const headers = {
      Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
      Accept: "application/json",
    };

    // Build URL with filters
    let url = `${baseUrl}/executions?testCaseKey=${encodeURIComponent(
      testCaseKey
    )}&maxResults=50&startAt=0`;

    // Add projectId filter if available
    if (projectId) {
      url += `&projectId=${projectId}`;
    } else if (ZEPHYR_PROJECT_ID) {
      url += `&projectId=${ZEPHYR_PROJECT_ID}`;
    }

    const response = await axios.get<ZephyrExecutionsResponse>(url, {
      headers,
    });

    return response.data.searchObjectList || [];
  } catch (error) {
    // Log but don't fail - some test cases might not have executions
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      logError(
        error,
        `Failed to fetch executions for test case ${testCaseKey}`
      );
    }
    return [];
  }
};

/**
 * Get links (traceability) for a test case
 *
 * cURL example:
 * curl -X GET \
 *   'https://prod-play.zephyr4jiracloud.com/connect/v2/testcases/{testCaseKey}/links' \
 *   -H 'Authorization: Bearer YOUR_TOKEN' \
 *   -H 'Accept: application/json'
 */
const getLinks = async (
  testCaseKey: string
): Promise<{
  issues?: Array<{
    issueId?: number;
    self?: string;
    id?: number;
    target?: string;
    type?: string;
  }>;
}> => {
  if (!ZEPHYR_CONNECT_BASE_URL || !ZEPHYR_ACCESS_TOKEN || !testCaseKey) {
    return {};
  }

  try {
    const baseUrl = getZephyrConnectV2BaseUrl();
    const headers = {
      Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
      Accept: "application/json",
    };

    // Use v2 API endpoint: /v2/testcases/{testCaseKey}/links
    const url = `${baseUrl}/testcases/${testCaseKey}/links`;
    const response = await axios.get<{
      issues?: Array<{
        issueId?: number;
        self?: string;
        id?: number;
        target?: string;
        type?: string;
      }>;
    }>(url, { headers });

    return response.data || {};
  } catch (error) {
    // Log but don't fail - some test cases might not have links
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      logError(error, `Failed to fetch links for test case ${testCaseKey}`);
    }
    return {};
  }
};

/**
 * Get detailed information for a single test case
 */
const getTestCaseDetails = async (
  testCase: ZephyrTestCase
): Promise<DetailedTestCase> => {
  const detailed: DetailedTestCase = {
    id: testCase.id,
    key: testCase.key,
    title: testCase.name,
    name: testCase.name,
    projectKey: testCase.projectKey,
    status: testCase.status,
    priority: testCase.priority,
    type: testCase.type,
    createdOn: testCase.createdOn,
    updatedOn: testCase.updatedOn,
    steps: [],
    executions: [],
    traceability: {
      requirements: [],
      linkedIssues: [],
      executions: [],
    },
  };

  // Extract description and preconditions from testCase if available
  // Check various possible field names
  if ((testCase as { description?: string }).description) {
    detailed.description = String(
      (testCase as { description?: string }).description
    );
  }
  if ((testCase as { objective?: string }).objective) {
    detailed.description = String(
      (testCase as { objective?: string }).objective
    );
  }
  if ((testCase as { preconditions?: string }).preconditions) {
    detailed.preconditions = String(
      (testCase as { preconditions?: string }).preconditions
    );
  }
  if ((testCase as { precondition?: string }).precondition) {
    detailed.preconditions = String(
      (testCase as { precondition?: string }).precondition
    );
  }

  // Extract projectId from testCase if available
  let projectId: string | number | undefined = ZEPHYR_PROJECT_ID;
  if (!projectId && (testCase as { project?: { id?: number } }).project) {
    projectId = (testCase as { project?: { id?: number } }).project?.id;
  }

  // Get test steps if we have testCaseKey
  if (testCase.key) {
    const steps = await getTestSteps(testCase.key);
    detailed.steps = steps.map((step, index) => {
      // Handle new API structure with inline object
      if (step.inline) {
        return {
          id: step.id,
          orderId: step.orderId || index + 1,
          step: step.inline.description || undefined,
          data: step.inline.testData || undefined,
          result: step.inline.expectedResult || undefined,
          conditions: step.inline.testData || undefined, // Test data contains conditions
          description: step.inline.description || undefined, // Step description
          expectations: step.inline.expectedResult || undefined, // Expected result
          createdOn: step.createdOn,
          lastModifiedOn: step.lastModifiedOn,
        };
      }
      // Fallback to legacy structure
      return {
        id: step.id,
        orderId: step.orderId || index + 1,
        step: step.step || undefined,
        data: step.data || undefined,
        result: step.result || undefined,
        conditions: step.data || undefined,
        description: step.step || undefined,
        expectations: step.result || undefined,
        createdOn: step.createdOn,
        lastModifiedOn: step.lastModifiedOn,
      };
    });
  }

  // Get executions if we have testCaseKey
  if (testCase.key) {
    const executions = await getExecutions(testCase.key, projectId);
    detailed.executions = executions.map((exec) => ({
      id: exec.id,
      status: exec.status?.name,
      cycleName: exec.cycleName,
      executedBy: exec.executedBy,
      executedOn: exec.executedOn,
      comment: exec.comment,
      defects: exec.defects,
    }));
  }

  // Get links (traceability) if we have testCaseKey
  if (testCase.key) {
    const links = await getLinks(testCase.key);
    if (links.issues && links.issues.length > 0) {
      detailed.traceability = {
        requirements: [],
        linkedIssues: links.issues.map((issue) => ({
          issueId: issue.issueId,
          id: issue.id,
          type: issue.type,
          target: issue.target,
          self: issue.self,
        })),
        executions: [],
      };
    }
  }

  return detailed;
};

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

      // Add projectId filter if provided
      if (ZEPHYR_PROJECT_ID) {
        url += `&projectId=${encodeURIComponent(ZEPHYR_PROJECT_ID)}`;
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

    // Save basic JSON file with test cases data
    const saveSpinner = ora({
      text: `Saving basic test cases data to output directory`,
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
      `Basic test cases data saved to: ${getRelativePath(jsonPath)}`
    );

    // Fetch detailed information for each test case
    const detailedSpinner = ora({
      text: `Fetching detailed information for test cases`,
      color: "white",
    }).start();

    const detailedTestCases: DetailedTestCase[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      detailedSpinner.text = `Fetching details for test case ${i + 1}/${
        testCases.length
      }: ${testCase.key || testCase.id}`;

      try {
        const detailed = await getTestCaseDetails(testCase);
        detailedTestCases.push(detailed);

        // Add a small delay to avoid rate limiting
        if (i < testCases.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        logError(
          error,
          `Failed to fetch details for test case ${testCase.key || testCase.id}`
        );
        // Add basic info even if detailed fetch fails
        detailedTestCases.push({
          id: testCase.id,
          key: testCase.key,
          title: testCase.name,
          name: testCase.name,
          projectKey: testCase.projectKey,
          status: testCase.status,
          priority: testCase.priority,
          type: testCase.type,
          createdOn: testCase.createdOn,
          updatedOn: testCase.updatedOn,
          steps: [],
          executions: [],
          traceability: {
            requirements: [],
            linkedIssues: [],
            executions: [],
          },
        });
      }
    }

    detailedSpinner.succeed(
      `Fetched detailed information for ${detailedTestCases.length} test cases`
    );

    // Save detailed JSON file
    const detailedJsonPath = join(rawDir, "zephyr-testcases-detailed.json");
    try {
      unlinkSync(detailedJsonPath);
    } catch {
      // File doesn't exist, which is fine
    }
    writeFileSync(
      detailedJsonPath,
      JSON.stringify(detailedTestCases, null, 2),
      "utf-8"
    );
    console.log(
      chalk.green(
        `Detailed test cases data saved to: ${getRelativePath(
          detailedJsonPath
        )}`
      )
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
        "Error: Project key is required.\n" +
          "Usage: bun run get-zephyr-testcases.ts <projectKey>\n" +
          "Or configure it in .testflow/config.json (zephyr.projectKey) or set ZEPHYR_PROJECT_KEY environment variable."
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

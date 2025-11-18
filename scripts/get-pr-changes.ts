import axios from "axios";
import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ora from "ora";
import chalk from "chalk";

// Helper function to convert absolute path to relative path
const getRelativePath = (absolutePath: string): string => {
  const relativePath = relative(process.cwd(), absolutePath);
  return relativePath.startsWith("..") ? absolutePath : `/${relativePath.replace(/\\/g, "/")}`;
};

const config = JSON.parse(
  readFileSync(join(process.cwd(), "config.json"), "utf8")
);
const { workspace, repo } = config;

const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
const BITBUCKET_EMAIL = process.env.BITBUCKET_EMAIL;
const BITBUCKET_API_TOKEN = process.env.BITBUCKET_API_TOKEN;

if (!BITBUCKET_EMAIL || !BITBUCKET_API_TOKEN) {
  console.error(
    chalk.red("Error: BITBUCKET_EMAIL and BITBUCKET_API_TOKEN environment variables are required")
  );
  process.exit(1);
}

const logError = (error: unknown, context: string) => {
  const logPath = join(process.cwd(), "testflow.log");
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error),
    axiosError: axios.isAxiosError(error) ? {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    } : undefined,
  };
  
  const logEntry = `\n[${timestamp}] ${context}\n${JSON.stringify(errorDetails, null, 2)}\n`;
  appendFileSync(logPath, logEntry, "utf-8");
};

interface PRChangesParams {
  workspace: string;
  repo: string;
  prId: string;
}

/**
 * Filter out useless information from patch (e.g., lock files, build artifacts)
 * Removes entire diff sections for files matching unwanted patterns
 */
export const filterPatch = (patch: string): string => {
  // Patterns for files to exclude (lock files, build artifacts, etc.)
  const excludePatterns = [
    /\.lock$/i, // yarn.lock, package-lock.json, bun.lockb, etc.
    /package-lock\.json$/i,
    /bun\.lockb$/i,
    /^dist\//i,
    /^build\//i,
    /node_modules\//i,
  ];

  const shouldExcludeFile = (filePath: string): boolean => {
    return excludePatterns.some((pattern) => pattern.test(filePath));
  };

  const lines = patch.split("\n");
  const filteredLines: string[] = [];
  let inExcludedDiff = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is the start of a new diff section
    if (line.startsWith("diff --git")) {
      // Extract file path from "diff --git a/path b/path"
      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      if (match) {
        const filePath = match[1]; // Use 'a' path (original)

        if (shouldExcludeFile(filePath)) {
          inExcludedDiff = true;
        } else {
          inExcludedDiff = false;
          filteredLines.push(line);
        }
      } else {
        // If we can't parse, include it
        inExcludedDiff = false;
        filteredLines.push(line);
      }
    } else if (inExcludedDiff) {
      // Skip lines until we hit the next diff section
      // Check if this line starts a new diff (shouldn't happen, but safety check)
      if (line.startsWith("diff --git")) {
        // This shouldn't happen, but handle it
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          const filePath = match[1];
          if (!shouldExcludeFile(filePath)) {
            inExcludedDiff = false;
            filteredLines.push(line);
          }
        }
      }
    } else {
      // Check if this is a summary line mentioning excluded files
      // Summary lines typically look like: " file.txt | 10 +++++-----"
      // or " create mode 100644 file.txt"
      if (
        (line.match(/^\s+\S+\.lock\b/i) ||
          line.match(/package-lock\.json/i) ||
          line.match(/bun\.lockb/i) ||
          line.match(/^\s+dist\//i) ||
          line.match(/^\s+build\//i) ||
          line.match(/node_modules\//i)) &&
        !line.startsWith("diff --git")
      ) {
        // Skip summary lines mentioning excluded files
        continue;
      }
      filteredLines.push(line);
    }
  }

  return filteredLines.join("\n");
};

/**
 * Extract Jira ticket ID from PR data
 * Looks in title, description, and branch names
 * Pattern: [A-Z]+-\d+ (e.g., BAT-2076, PROJ-123)
 */
const extractTicketId = (prData: unknown): string | null => {
  try {
    const pr = prData as {
      title?: string;
      description?: string;
      source?: { branch?: { name?: string } };
      destination?: { branch?: { name?: string } };
    };

    // Jira ticket pattern: uppercase letters, dash, digits (e.g., BAT-2076, PROJ-123)
    const ticketPattern = /([A-Z]+-\d+)/g;
    const foundTickets = new Set<string>();

    // Check title
    if (pr.title) {
      const titleMatches = pr.title.match(ticketPattern);
      if (titleMatches) {
        for (const ticket of titleMatches) {
          foundTickets.add(ticket);
        }
      }
    }

    // Check description
    if (pr.description) {
      const descMatches = pr.description.match(ticketPattern);
      if (descMatches) {
        for (const ticket of descMatches) {
          foundTickets.add(ticket);
        }
      }
    }

    // Check source branch
    if (pr.source?.branch?.name) {
      const branchMatches = pr.source.branch.name.match(ticketPattern);
      if (branchMatches) {
        for (const ticket of branchMatches) {
          foundTickets.add(ticket);
        }
      }
    }

    // Check destination branch
    if (pr.destination?.branch?.name) {
      const branchMatches = pr.destination.branch.name.match(ticketPattern);
      if (branchMatches) {
        for (const ticket of branchMatches) {
          foundTickets.add(ticket);
        }
      }
    }

    // Return the first found ticket ID (most common case: one ticket per PR)
    if (foundTickets.size > 0) {
      const ticketId = Array.from(foundTickets)[0];
      return ticketId;
    }

    return null;
  } catch (error) {
    logError(error, "Error extracting ticket ID from PR");
    return null;
  }
};

export const getPRChanges = async ({
  workspace,
  repo,
  prId,
}: PRChangesParams) => {
  // Create Basic Auth header
  const auth = Buffer.from(
    `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  // Get PR details using the official API endpoint
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}
  // Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-get
  const prSpinner = ora({
    text: `Fetching PR details for PR #${prId}`,
    color: "white",
  }).start();
  const prUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}`;
  const prResponse = await axios.get(prUrl, { headers });
  prSpinner.succeed(`Fetched PR details for PR #${prId}`);

  const changes: {
    pr: unknown;
    diffstat?: unknown;
    diff?: string;
    patch?: string;
    errors?: Array<{
      endpoint: string;
      message: string;
      requiredScopes?: string[];
    }>;
  } = {
    pr: prResponse.data, // Full PR object from API
  };

  // Get PR diffstat (changed files with stats) - optional, requires read:repository:bitbucket scope
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diffstat
  const diffstatSpinner = ora({
    text: `  Fetching PR diffstat for PR #${prId}`,
    color: "white",
  }).start();
  const diffstatUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/diffstat`;
  try {
    const diffstatResponse = await axios.get(diffstatUrl, { headers });
    changes.diffstat = diffstatResponse.data;
    diffstatSpinner.succeed(`  Fetched PR diffstat for PR #${prId}`);
  } catch (error) {
    logError(error, `Failed to fetch PR diffstat for PR ${prId}`);
    diffstatSpinner.warn(chalk.yellow(`  PR diffstat not available for PR #${prId}`));
    if (!changes.errors) changes.errors = [];
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      changes.errors.push({
        endpoint: "diffstat",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      changes.errors.push({
        endpoint: "diffstat",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get PR diff (actual file changes - returns plain text) - optional, requires read:repository:bitbucket scope
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diff
  const diffSpinner = ora({
    text: `  Fetching PR diff for PR #${prId}`,
    color: "white",
  }).start();
  const diffUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`;
  try {
    const diffResponse = await axios.get(diffUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "text/plain",
      },
      responseType: "text",
    });
    changes.diff = diffResponse.data;
    diffSpinner.succeed(`  Fetched PR diff for PR #${prId}`);
  } catch (error) {
    logError(error, `Failed to fetch PR diff for PR ${prId}`);
    diffSpinner.warn(chalk.yellow(`  PR diff not available for PR #${prId}`));
    if (!changes.errors) changes.errors = [];
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      changes.errors.push({
        endpoint: "diff",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      changes.errors.push({
        endpoint: "diff",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get PR patch (unified diff format) - optional, requires read:repository:bitbucket scope
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/patch
  // Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-patch-get
  const patchSpinner = ora({
    text: `  Fetching PR patch for PR #${prId}`,
    color: "white",
  }).start();
  const patchUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/patch`;
  try {
    const patchResponse = await axios.get(patchUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "text/plain",
      },
      responseType: "text",
    });
    changes.patch = patchResponse.data;
    patchSpinner.succeed(`  Fetched PR patch for PR #${prId}`);
  } catch (error) {
    logError(error, `Failed to fetch PR patch for PR ${prId}`);
    patchSpinner.warn(chalk.yellow(`  PR patch not available for PR #${prId}`));
    if (!changes.errors) changes.errors = [];
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      changes.errors.push({
        endpoint: "patch",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      changes.errors.push({
        endpoint: "patch",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return changes;
};

const main = async () => {
  const prId = process.argv[2];

  if (!prId) {
    console.error(chalk.red("Error: PR ID is required"));
    console.error(chalk.yellow("Usage: bun run get-pr-changes.ts <prId>"));
    console.error(chalk.yellow("Example: bun run get-pr-changes.ts 123"));
    process.exit(1);
  }

  try {
    const changes = await getPRChanges({ workspace, repo, prId });

    // Extract ticket ID from PR data
    const ticketIdSpinner = ora({
      text: `Extracting ticket ID from PR #${prId}`,
      color: "white",
    }).start();
    const ticketId = extractTicketId(changes.pr);

    if (!ticketId) {
      ticketIdSpinner.fail(chalk.red("Could not extract ticket ID from PR"));
      console.error(chalk.red("❌ Could not extract ticket ID from PR"));
      process.exit(1);
    }
    ticketIdSpinner.succeed(`Extracted ticket ID: ${ticketId}`);

    // Create output directory if it doesn't exist
    // Always output to a folder named with the ticket ID
    const outputDir = join(process.cwd(), "output", ticketId);
    mkdirSync(outputDir, { recursive: true });

    // Create raw subdirectory for JSON files
    const rawDir = join(outputDir, "raw");
    mkdirSync(rawDir, { recursive: true });

    // Save JSON file with PR changes
    const saveSpinner = ora({
      text: `Saving PR changes to output directory`,
      color: "white",
    }).start();
    const jsonPath = join(rawDir, "pr.json");
    // Delete only the specific file if it exists (don't clean the entire raw folder)
    try {
      unlinkSync(jsonPath);
    } catch {
      // File doesn't exist, which is fine
    }
    writeFileSync(jsonPath, JSON.stringify(changes, null, 2), "utf-8");
    saveSpinner.succeed(`PR changes saved to: ${getRelativePath(jsonPath)}`);

    // Save patch file if available
    if (changes.patch) {
      const patchSaveSpinner = ora({
        text: `  Saving PR patch file`,
        color: "white",
      }).start();
      const filteredPatch = filterPatch(changes.patch);
      const patchPath = join(outputDir, "pr.patch");
      writeFileSync(patchPath, filteredPatch, "utf-8");
      patchSaveSpinner.succeed(`  PR patch saved to: ${getRelativePath(patchPath)}`);
    }
  } catch (error) {
    logError(error, `Failed to fetch PR changes for PR ${prId}`);
    console.error(chalk.red("❌ Failed to fetch PR changes"));
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

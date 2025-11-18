import axios from "axios";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const config = JSON.parse(
  readFileSync(join(process.cwd(), "config.json"), "utf8")
);
const { workspace, repo } = config;

const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
const BITBUCKET_EMAIL = process.env.BITBUCKET_EMAIL;
const BITBUCKET_API_TOKEN = process.env.BITBUCKET_API_TOKEN;

if (!BITBUCKET_EMAIL || !BITBUCKET_API_TOKEN) {
  console.error(
    "Error: BITBUCKET_EMAIL and BITBUCKET_API_TOKEN environment variables are required"
  );
  process.exit(1);
}

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
      if (foundTickets.size > 1) {
        console.warn(
          `⚠️  Multiple ticket IDs found: ${Array.from(foundTickets).join(
            ", "
          )}. Using: ${ticketId}`
        );
      }
      return ticketId;
    }

    return null;
  } catch (error) {
    console.warn("⚠️  Error extracting ticket ID from PR:", error);
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
  const prUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}`;
  console.log("Fetching PR details...");
  const prResponse = await axios.get(prUrl, { headers });

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
  const diffstatUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/diffstat`;
  try {
    console.log("Fetching PR diffstat...");
    const diffstatResponse = await axios.get(diffstatUrl, { headers });
    changes.diffstat = diffstatResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      console.warn(
        `⚠️  Could not fetch diffstat: Missing required scope(s): ${requiredScopes.join(
          ", "
        )}`
      );
      if (!changes.errors) changes.errors = [];
      changes.errors.push({
        endpoint: "diffstat",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      console.warn(
        "⚠️  Could not fetch diffstat:",
        error instanceof Error ? error.message : "Unknown error"
      );
      if (!changes.errors) changes.errors = [];
      changes.errors.push({
        endpoint: "diffstat",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get PR diff (actual file changes - returns plain text) - optional, requires read:repository:bitbucket scope
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diff
  const diffUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`;
  try {
    console.log("Fetching PR diff...");
    const diffResponse = await axios.get(diffUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "text/plain",
      },
      responseType: "text",
    });
    changes.diff = diffResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      console.warn(
        `⚠️  Could not fetch diff: Missing required scope(s): ${requiredScopes.join(
          ", "
        )}`
      );
      if (!changes.errors) changes.errors = [];
      changes.errors.push({
        endpoint: "diff",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      console.warn(
        "⚠️  Could not fetch diff:",
        error instanceof Error ? error.message : "Unknown error"
      );
      if (!changes.errors) changes.errors = [];
      changes.errors.push({
        endpoint: "diff",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get PR patch (unified diff format) - optional, requires read:repository:bitbucket scope
  // GET /repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/patch
  // Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-patch-get
  const patchUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests/${prId}/patch`;
  try {
    console.log("Fetching PR patch...");
    const patchResponse = await axios.get(patchUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "text/plain",
      },
      responseType: "text",
    });
    changes.patch = patchResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const errorData = error.response.data as {
        error?: { detail?: { required?: string[] } };
      };
      const requiredScopes = errorData.error?.detail?.required || [];
      console.warn(
        `⚠️  Could not fetch patch: Missing required scope(s): ${requiredScopes.join(
          ", "
        )}`
      );
      if (!changes.errors) changes.errors = [];
      changes.errors.push({
        endpoint: "patch",
        message: "Missing required scopes",
        requiredScopes,
      });
    } else {
      console.warn(
        "⚠️  Could not fetch patch:",
        error instanceof Error ? error.message : "Unknown error"
      );
      if (!changes.errors) changes.errors = [];
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
  // Example usage - modify these values for testing
  console.log(`Fetching PR changes for ${workspace}/${repo}#${prId}...`);

  try {
    const changes = await getPRChanges({ workspace, repo, prId });

    // Extract ticket ID from PR data
    const ticketId = extractTicketId(changes.pr);

    if (!ticketId) {
      console.error(
        "❌ Could not extract ticket ID from PR. Please ensure the PR title, description, or branch name contains a Jira ticket ID (e.g., BAT-2076)."
      );
      process.exit(1);
    }

    console.log(`📋 Extracted ticket ID: ${ticketId}`);

    // Create output directory if it doesn't exist
    // Always output to a folder named with the ticket ID
    const outputDir = join(process.cwd(), "output", ticketId);
    mkdirSync(outputDir, { recursive: true });

    // Create raw subdirectory for JSON files
    const rawDir = join(outputDir, "raw");
    mkdirSync(rawDir, { recursive: true });

    // Save JSON file with PR changes
    const jsonPath = join(rawDir, "pr.json");
    // Delete only the specific file if it exists (don't clean the entire raw folder)
    try {
      unlinkSync(jsonPath);
    } catch {
      // File doesn't exist, which is fine
    }
    writeFileSync(jsonPath, JSON.stringify(changes, null, 2), "utf-8");
    console.log(`✅ PR changes saved to: ${jsonPath}`);

    // Save patch file if available
    if (changes.patch) {
      const filteredPatch = filterPatch(changes.patch);
      const patchPath = join(outputDir, "pr.patch");
      writeFileSync(patchPath, filteredPatch, "utf-8");
      console.log(`✅ PR patch saved to: ${patchPath}`);
    }

    const prData = changes.pr as { title?: string; state?: string };
    console.log(`📊 PR #${prId}: ${prData.title || "Untitled"}`);
    console.log(`🔀 State: ${prData.state || "Unknown"}`);

    if (changes.diffstat) {
      const diffstatData = changes.diffstat as { values?: unknown[] };
      console.log(`📁 Files changed: ${diffstatData.values?.length || 0}`);
    } else {
      console.log("📁 Files changed: N/A (diffstat not available)");
    }

    if (changes.errors && changes.errors.length > 0) {
      console.log(
        "\n⚠️  Note: Some data could not be fetched due to missing API token scopes."
      );
      console.log(
        '   To get full PR changes, ensure your token has the "read:repository:bitbucket" scope.'
      );
    }
  } catch (error) {
    console.error("Failed to fetch PR changes:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

import axios from "axios";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { filterPatch, getPRChanges } from "./get-pr-changes";

const config = JSON.parse(
  readFileSync(join(process.cwd(), "config.json"), "utf8")
);
const { jiraBaseUrl, workspace, repo } = config;

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const BITBUCKET_EMAIL = process.env.BITBUCKET_EMAIL;
const BITBUCKET_API_TOKEN = process.env.BITBUCKET_API_TOKEN;

if (!JIRA_API_TOKEN) {
  console.error("Error: JIRA_API_TOKEN environment variable is required");
  process.exit(1);
}

if (!jiraBaseUrl) {
  console.error("Error: jiraBaseUrl is required in config.json");
  process.exit(1);
}

if (!JIRA_EMAIL) {
  console.error(
    "Error: JIRA_EMAIL environment variable is required for Basic Authentication"
  );
  process.exit(1);
}

interface JiraIssueParams {
  issueIdOrKey: string;
}

export const getJiraIssue = async ({ issueIdOrKey }: JiraIssueParams) => {
  // Create Basic Auth header
  // Jira uses email:apiToken format for Basic Auth
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    "base64"
  );

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  // Normalize base URL - remove trailing slashes and any existing API paths
  let normalizedBaseUrl = jiraBaseUrl.trim().replace(/\/+$/, "");
  // Remove any existing /rest/api/X path if present
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

  // Get issue details using the official API endpoint
  // Try v3 first, fallback to v2 if needed
  // GET /rest/api/3/issue/{issueIdOrKey}
  // Reference: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
  const issueData: {
    issue?: unknown;
    changelog?: unknown;
    errors?: Array<{ endpoint: string; message: string }>;
  } = {};

  // Try v3 API first
  // Include comments and rendered fields in the response
  let issueUrl = `${normalizedBaseUrl}/rest/api/3/issue/${issueIdOrKey}?expand=renderedFields`;
  console.log(`Fetching Jira issue: ${issueIdOrKey}...`);
  console.log(`Trying API v3: ${issueUrl}`);

  try {
    const issueResponse = await axios.get(issueUrl, { headers });
    issueData.issue = issueResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // If v3 returns 404, try v2 as fallback
      if (error.response?.status === 404) {
        console.log(`API v3 returned 404, trying API v2...`);
        issueUrl = `${normalizedBaseUrl}/rest/api/2/issue/${issueIdOrKey}?expand=renderedFields`;
        console.log(`Trying API v2: ${issueUrl}`);
        try {
          const issueResponseV2 = await axios.get(issueUrl, { headers });
          issueData.issue = issueResponseV2.data;
        } catch (v2Error) {
          if (axios.isAxiosError(v2Error)) {
            if (v2Error.response?.status === 401) {
              console.error(
                "❌ Authentication failed. Please check your JIRA_EMAIL and JIRA_API_TOKEN."
              );
              console.error("Response:", v2Error.response.data);
              process.exit(1);
            } else if (v2Error.response?.status === 404) {
              console.error(
                `❌ Issue ${issueIdOrKey} not found in both API v2 and v3.`
              );
              console.error("Response:", v2Error.response.data);
              process.exit(1);
            } else if (v2Error.response?.status === 403) {
              console.error(
                "❌ Access forbidden. Check your permissions for this issue."
              );
              console.error("Response:", v2Error.response.data);
              process.exit(1);
            }
          }
          console.error(
            "Failed to fetch issue with API v2:",
            v2Error instanceof Error ? v2Error.message : "Unknown error"
          );
          process.exit(1);
        }
      } else if (error.response?.status === 401) {
        console.error(
          "❌ Authentication failed. Please check your JIRA_EMAIL and JIRA_API_TOKEN."
        );
        console.error("Response:", error.response.data);
        process.exit(1);
      } else if (error.response?.status === 403) {
        console.error(
          "❌ Access forbidden. Check your permissions for this issue."
        );
        console.error("Response:", error.response.data);
        process.exit(1);
      } else {
        console.error(
          "Failed to fetch issue:",
          error instanceof Error ? error.message : "Unknown error"
        );
        if (error.response) {
          console.error("Status:", error.response.status);
          console.error("Response:", error.response.data);
        }
        process.exit(1);
      }
    } else {
      console.error(
        "Failed to fetch issue:",
        error instanceof Error ? error.message : "Unknown error"
      );
      process.exit(1);
    }
  }

  // Get issue changelog (optional) - shows history of changes
  // Use the same API version that worked for the issue
  const apiVersion = issueUrl.includes("/rest/api/2/") ? "2" : "3";
  const changelogUrl = `${normalizedBaseUrl}/rest/api/${apiVersion}/issue/${issueIdOrKey}/changelog`;
  try {
    console.log("Fetching issue changelog...");
    const changelogResponse = await axios.get(changelogUrl, { headers });
    issueData.changelog = changelogResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      console.warn("⚠️  Could not fetch changelog: Access forbidden");
      if (!issueData.errors) issueData.errors = [];
      issueData.errors.push({
        endpoint: "changelog",
        message: "Access forbidden",
      });
    } else {
      console.warn(
        "⚠️  Could not fetch changelog:",
        error instanceof Error ? error.message : "Unknown error"
      );
      if (!issueData.errors) issueData.errors = [];
      issueData.errors.push({
        endpoint: "changelog",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return issueData;
};

interface BitbucketBranchInfo {
  branchName?: string;
  branchUrl?: string;
  prId?: string;
  prUrl?: string;
  source?: "jira_dev_status" | "bitbucket_pr" | "bitbucket_branch";
}

/**
 * Fetch the Bitbucket branch associated with a Jira ticket
 * Uses multiple methods:
 * 1. Jira Development Status API (if Jira and Bitbucket are integrated)
 * 2. Search Bitbucket PRs for the ticket ID
 * 3. Search Bitbucket branches directly
 */
export const getBitbucketBranch = async ({
  issueIdOrKey,
}: {
  issueIdOrKey: string;
}): Promise<BitbucketBranchInfo | null> => {
  const branchInfo: BitbucketBranchInfo = {};

  // Method 1: Try Jira Development Status API
  // GET /rest/dev-status/1.0/issue/detail?issueId={issueId}&applicationType=bitbucket&dataType=repository
  // Reference: https://support.atlassian.com/jira/kb/how-to-retrieve-pull-request-and-bitbucket-repo-and-branch-information-from-an-issue-using-rest-api/
  if (jiraBaseUrl) {
    try {
      const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
        "base64"
      );
      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };

      // First, get the issue ID (not key) for the dev-status API
      let normalizedBaseUrl = jiraBaseUrl.trim().replace(/\/+$/, "");
      normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

      // Get issue to extract ID
      const issueUrl = `${normalizedBaseUrl}/rest/api/3/issue/${issueIdOrKey}`;
      try {
        const issueResponse = await axios.get(issueUrl, { headers });
        const issue = issueResponse.data as { id?: string };
        const issueId = issue.id;

        if (issueId) {
          const devStatusUrl = `${normalizedBaseUrl}/rest/dev-status/1.0/issue/detail?issueId=${issueId}&applicationType=bitbucket&dataType=repository`;
          console.log("Trying Jira Development Status API...");
          const devStatusResponse = await axios.get(devStatusUrl, { headers });
          const devStatus = devStatusResponse.data as {
            detail?: Array<{
              branches?: Array<{
                name?: string;
                url?: string;
              }>;
              pullRequests?: Array<{
                id?: string;
                url?: string;
                source?: { branch?: { name?: string } };
              }>;
            }>;
          };

          if (devStatus.detail && devStatus.detail.length > 0) {
            const detail = devStatus.detail[0];
            // Get branch from branches array
            if (detail.branches && detail.branches.length > 0) {
              const branch = detail.branches[0];
              branchInfo.branchName = branch.name;
              branchInfo.branchUrl = branch.url;
              branchInfo.source = "jira_dev_status";
              console.log(
                `✅ Found branch via Jira Development Status API: ${branch.name}`
              );
              return branchInfo;
            }
            // Get branch from PR source
            if (detail.pullRequests && detail.pullRequests.length > 0) {
              const pr = detail.pullRequests[0];
              if (pr.source?.branch?.name) {
                branchInfo.branchName = pr.source.branch.name;
                branchInfo.prId = pr.id?.toString();
                branchInfo.prUrl = pr.url;
                branchInfo.source = "jira_dev_status";
                console.log(
                  `✅ Found branch via Jira Development Status API (from PR): ${pr.source.branch.name}`
                );
                return branchInfo;
              }
            }
          }
        }
      } catch (error) {
        // Dev status API might not be available or integrated, continue to fallback methods
        if (axios.isAxiosError(error) && error.response?.status !== 404) {
          console.warn(
            "⚠️  Jira Development Status API not available or not integrated"
          );
        }
      }
    } catch {
      console.warn(
        "⚠️  Could not fetch branch from Jira Development Status API"
      );
    }
  }

  // Method 2: Search Bitbucket PRs for the ticket ID
  if (workspace && repo && BITBUCKET_EMAIL && BITBUCKET_API_TOKEN) {
    try {
      const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
      const auth = Buffer.from(
        `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
      ).toString("base64");
      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };

      // Search PRs - try different states
      const states = ["OPEN", "MERGED", "SUPERSEDED", "DECLINED"];
      const ticketPattern = new RegExp(
        issueIdOrKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      for (const state of states) {
        try {
          // GET /repositories/{workspace}/{repo_slug}/pullrequests?state={state}
          // Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-get
          const prsUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/pullrequests?state=${state}&pagelen=50`;
          console.log(`Searching Bitbucket PRs (state: ${state})...`);
          const prsResponse = await axios.get(prsUrl, { headers });
          const prsData = prsResponse.data as {
            values?: Array<{
              id?: number;
              title?: string;
              description?: string;
              source?: { branch?: { name?: string } };
              links?: { html?: { href?: string } };
            }>;
            next?: string;
          };

          if (prsData.values) {
            for (const pr of prsData.values) {
              // Check if PR title, description, or branch name contains the ticket ID
              const titleMatch = pr.title && ticketPattern.test(pr.title);
              const descMatch =
                pr.description && ticketPattern.test(pr.description);
              const branchMatch =
                pr.source?.branch?.name &&
                ticketPattern.test(pr.source.branch.name);

              if (titleMatch || descMatch || branchMatch) {
                branchInfo.branchName = pr.source?.branch?.name;
                branchInfo.prId = pr.id?.toString();
                branchInfo.prUrl = pr.links?.html?.href;
                branchInfo.source = "bitbucket_pr";
                console.log(
                  `✅ Found branch via Bitbucket PR search: ${pr.source?.branch?.name}`
                );
                return branchInfo;
              }
            }
          }

          // Handle pagination if needed
          let nextUrl = prsData.next;
          while (nextUrl) {
            try {
              const nextResponse = await axios.get(nextUrl, { headers });
              const nextData = nextResponse.data as {
                values?: Array<{
                  id?: number;
                  title?: string;
                  description?: string;
                  source?: { branch?: { name?: string } };
                  links?: { html?: { href?: string } };
                }>;
                next?: string;
              };

              if (nextData.values) {
                for (const pr of nextData.values) {
                  const titleMatch = pr.title && ticketPattern.test(pr.title);
                  const descMatch =
                    pr.description && ticketPattern.test(pr.description);
                  const branchMatch =
                    pr.source?.branch?.name &&
                    ticketPattern.test(pr.source.branch.name);

                  if (titleMatch || descMatch || branchMatch) {
                    branchInfo.branchName = pr.source?.branch?.name;
                    branchInfo.prId = pr.id?.toString();
                    branchInfo.prUrl = pr.links?.html?.href;
                    branchInfo.source = "bitbucket_pr";
                    console.log(
                      `✅ Found branch via Bitbucket PR search: ${pr.source?.branch?.name}`
                    );
                    return branchInfo;
                  }
                }
              }

              nextUrl = nextData.next;
            } catch {
              break;
            }
          }
        } catch (error) {
          // Continue to next state or method
          if (axios.isAxiosError(error) && error.response?.status === 403) {
            console.warn(
              `⚠️  Access forbidden when searching PRs (state: ${state})`
            );
          }
        }
      }
    } catch (error) {
      console.warn(
        "⚠️  Could not search Bitbucket PRs:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Method 3: Search branches directly in Bitbucket
    try {
      const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
      const auth = Buffer.from(
        `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
      ).toString("base64");
      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };

      // GET /repositories/{workspace}/{repo_slug}/refs/branches
      // Reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-refs/#api-repositories-workspace-repo-slug-refs-branches-get
      const branchesUrl = `${BITBUCKET_BASE_URL}/repositories/${workspace}/${repo}/refs/branches?pagelen=100`;
      console.log("Searching Bitbucket branches...");
      const branchesResponse = await axios.get(branchesUrl, { headers });
      const branchesData = branchesResponse.data as {
        values?: Array<{
          name?: string;
          links?: { html?: { href?: string } };
        }>;
        next?: string;
      };

      const ticketPattern = new RegExp(
        issueIdOrKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      if (branchesData.values) {
        for (const branch of branchesData.values) {
          if (branch.name && ticketPattern.test(branch.name)) {
            branchInfo.branchName = branch.name;
            branchInfo.branchUrl = branch.links?.html?.href;
            branchInfo.source = "bitbucket_branch";
            console.log(
              `✅ Found branch via direct branch search: ${branch.name}`
            );
            return branchInfo;
          }
        }
      }

      // Handle pagination
      let nextUrl = branchesData.next;
      while (nextUrl) {
        try {
          const nextResponse = await axios.get(nextUrl, { headers });
          const nextData = nextResponse.data as {
            values?: Array<{
              name?: string;
              links?: { html?: { href?: string } };
            }>;
            next?: string;
          };

          if (nextData.values) {
            for (const branch of nextData.values) {
              if (branch.name && ticketPattern.test(branch.name)) {
                branchInfo.branchName = branch.name;
                branchInfo.branchUrl = branch.links?.html?.href;
                branchInfo.source = "bitbucket_branch";
                console.log(
                  `✅ Found branch via direct branch search: ${branch.name}`
                );
                return branchInfo;
              }
            }
          }

          nextUrl = nextData.next;
        } catch {
          break;
        }
      }
    } catch (error) {
      console.warn(
        "⚠️  Could not search Bitbucket branches:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  console.warn(
    `⚠️  Could not find branch associated with ticket ${issueIdOrKey}`
  );
  return null;
};

const createCompactIssue = (issueData: {
  issue?: unknown;
  changelog?: unknown;
  errors?: Array<{ endpoint: string; message: string }>;
}) => {
  const issue = issueData.issue as {
    key?: string;
    fields?: {
      summary?: string;
      description?: string | { type?: string; content?: unknown[] };
      status?: { name?: string };
      issuetype?: { name?: string };
      priority?: { name?: string };
      labels?: string[];
      components?: Array<{ name?: string }>;
      fixVersions?: Array<{ name?: string }>;
      comment?: {
        comments?: Array<{
          body?: string | { type?: string; content?: unknown[] };
        }>;
      };
    };
  };

  // Helper to extract text from Jira's ADF (Atlassian Document Format) or plain text
  const extractText = (
    content: string | { type?: string; content?: unknown[] } | undefined
  ): string => {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (
      typeof content === "object" &&
      content.type === "doc" &&
      Array.isArray(content.content)
    ) {
      const extractFromNodes = (nodes: unknown[]): string => {
        return nodes
          .map((node) => {
            if (typeof node === "object" && node !== null) {
              const nodeObj = node as {
                type?: string;
                content?: unknown[];
                text?: string;
              };
              if (nodeObj.text) return nodeObj.text;
              if (Array.isArray(nodeObj.content))
                return extractFromNodes(nodeObj.content);
            }
            return "";
          })
          .filter(Boolean)
          .join(" ");
      };
      return extractFromNodes(content.content);
    }
    return "";
  };

  // Extract status transitions from changelog (simplified)
  const statusTransitions: string[] = [];
  if (issueData.changelog) {
    const changelog = issueData.changelog as {
      histories?: Array<{
        items?: Array<{
          field?: string;
          fromString?: string;
          toString?: string;
        }>;
      }>;
    };
    if (changelog.histories) {
      changelog.histories.forEach((history) => {
        history.items?.forEach((item) => {
          if (item.field === "status" && item.fromString && item.toString) {
            statusTransitions.push(`${item.fromString} → ${item.toString}`);
          }
        });
      });
    }
  }

  // Extract comments (text only)
  const comments =
    issue.fields?.comment?.comments
      ?.map((comment) => extractText(comment.body))
      .filter((text) => text.trim().length > 0) || [];

  // Build plain text output
  const lines: string[] = [];

  // Issue key
  if (issue.key) {
    lines.push(`Issue: ${issue.key}`);
    lines.push("");
  }

  // Summary
  if (issue.fields?.summary) {
    lines.push(`Summary: ${issue.fields.summary}`);
    lines.push("");
  }

  // Description
  const description = extractText(issue.fields?.description);
  if (description) {
    lines.push("Description:");
    lines.push(description);
    lines.push("");
  }

  // Status
  if (issue.fields?.status?.name) {
    lines.push(`Status: ${issue.fields.status.name}`);
  }

  // Type
  if (issue.fields?.issuetype?.name) {
    lines.push(`Type: ${issue.fields.issuetype.name}`);
  }

  // Priority
  if (issue.fields?.priority?.name) {
    lines.push(`Priority: ${issue.fields.priority.name}`);
  }

  // Labels
  if (issue.fields?.labels && issue.fields.labels.length > 0) {
    lines.push(`Labels: ${issue.fields.labels.join(", ")}`);
  }

  // Components
  const components =
    issue.fields?.components?.map((c) => c.name || "").filter(Boolean) || [];
  if (components.length > 0) {
    lines.push(`Components: ${components.join(", ")}`);
  }

  // Fix Versions
  const fixVersions =
    issue.fields?.fixVersions?.map((v) => v.name || "").filter(Boolean) || [];
  if (fixVersions.length > 0) {
    lines.push(`Fix Versions: ${fixVersions.join(", ")}`);
  }

  // Status Transitions
  if (statusTransitions.length > 0) {
    lines.push("");
    lines.push("Status Transitions:");
    statusTransitions.forEach((transition) => {
      lines.push(`  - ${transition}`);
    });
  }

  // Comments
  if (comments.length > 0) {
    lines.push("");
    lines.push("Comments:");
    comments.forEach((comment, index) => {
      lines.push("");
      lines.push(`Comment ${index + 1}:`);
      lines.push(comment);
    });
  }

  return lines.join("\n");
};

// bun run get-jira-issue.ts BAT-2076
const main = async () => {
  // Get issue ID or key from command line arguments
  // Usage: bun run get-jira-issue.ts <issueIdOrKey>
  // Example: bun run get-jira-issue.ts PROJ-123
  const issueIdOrKey = process.argv[2];

  if (!issueIdOrKey) {
    console.error("Error: Issue ID or key is required");
    console.error("Usage: bun run get-jira-issue.ts <issueIdOrKey>");
    console.error("Example: bun run get-jira-issue.ts PROJ-123");
    process.exit(1);
  }

  console.log(`Fetching Jira issue: ${issueIdOrKey}...`);

  try {
    const issueData = await getJiraIssue({ issueIdOrKey });

    // Try to fetch associated Bitbucket branch
    let branchInfo: BitbucketBranchInfo | null = null;
    try {
      branchInfo = await getBitbucketBranch({ issueIdOrKey });
    } catch (error) {
      console.warn(
        "⚠️  Could not fetch Bitbucket branch:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Create output directory if it doesn't exist
    // Output to a folder named with the ticket ID
    const outputDir = join(process.cwd(), "output", issueIdOrKey);
    mkdirSync(outputDir, { recursive: true });

    // Create raw subdirectory for JSON files
    const rawDir = join(outputDir, "raw");
    mkdirSync(rawDir, { recursive: true });

    // Save JSON file with issue data
    const jsonPath = join(rawDir, "jira-issue.json");
    // Delete only the specific file if it exists (don't clean the entire raw folder)
    try {
      unlinkSync(jsonPath);
    } catch {
      // File doesn't exist, which is fine
    }
    writeFileSync(jsonPath, JSON.stringify(issueData, null, 2), "utf-8");
    console.log(`✅ Issue data saved to: ${jsonPath}`);

    // Save branch info if found
    if (branchInfo) {
      const branchPath = join(rawDir, "bitbucket-branch.json");
      try {
        unlinkSync(branchPath);
      } catch {
        // File doesn't exist, which is fine
      }
      writeFileSync(branchPath, JSON.stringify(branchInfo, null, 2), "utf-8");
      console.log(`✅ Branch info saved to: ${branchPath}`);

      // If PR ID is found, fetch PR changes
      if (branchInfo.prId && workspace && repo) {
        try {
          console.log(`\n🔗 Fetching PR changes for PR #${branchInfo.prId}...`);
          const prChanges = await getPRChanges({
            workspace,
            repo,
            prId: branchInfo.prId,
          });

          // Save PR changes JSON
          const prJsonPath = join(rawDir, "bitbucket-pullrequests.json");
          try {
            unlinkSync(prJsonPath);
          } catch {
            // File doesn't exist, which is fine
          }
          writeFileSync(
            prJsonPath,
            JSON.stringify(prChanges, null, 2),
            "utf-8"
          );
          console.log(`✅ PR changes saved to: ${prJsonPath}`);

          // Save patch file if available
          if (prChanges.patch) {
            const filteredPatch = filterPatch(prChanges.patch);
            const patchPath = join(outputDir, "pr.patch");
            writeFileSync(patchPath, filteredPatch, "utf-8");
            console.log(`✅ PR patch saved to: ${patchPath}`);
          }

          // Display PR summary
          const prData = prChanges.pr as { title?: string; state?: string };
          console.log(
            `\n📊 PR #${branchInfo.prId}: ${prData.title || "Untitled"}`
          );
          console.log(`🔀 State: ${prData.state || "Unknown"}`);

          if (prChanges.diffstat) {
            const diffstatData = prChanges.diffstat as { values?: unknown[] };
            console.log(
              `📁 Files changed: ${diffstatData.values?.length || 0}`
            );
          } else {
            console.log("📁 Files changed: N/A (diffstat not available)");
          }

          if (prChanges.errors && prChanges.errors.length > 0) {
            console.log(
              "\n⚠️  Note: Some PR data could not be fetched due to missing API token scopes."
            );
            console.log(
              '   To get full PR changes, ensure your token has the "read:repository:bitbucket" scope.'
            );
          }
        } catch (error) {
          console.warn(
            `⚠️  Could not fetch PR changes for PR #${branchInfo.prId}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
    }

    // Create and save compact version for LLM context (plain text)
    const compactIssue = createCompactIssue(issueData);
    const compactPath = join(outputDir, "jira-issue-description.txt");
    writeFileSync(compactPath, compactIssue, "utf-8");
    console.log(`✅ Compact issue data saved to: ${compactPath}`);

    // Display summary information
    const issue = issueData.issue as {
      key?: string;
      fields?: {
        summary?: string;
        status?: { name?: string };
        assignee?: { displayName?: string; emailAddress?: string } | null;
        reporter?: { displayName?: string; emailAddress?: string };
        created?: string;
        updated?: string;
        issuetype?: { name?: string };
        priority?: { name?: string };
      };
    };

    if (issue) {
      console.log(`\n📊 Issue: ${issue.key || issueIdOrKey}`);
      console.log(`📝 Summary: ${issue.fields?.summary || "N/A"}`);
      console.log(`📋 Type: ${issue.fields?.issuetype?.name || "N/A"}`);
      console.log(`📌 Status: ${issue.fields?.status?.name || "N/A"}`);
      console.log(`⚡ Priority: ${issue.fields?.priority?.name || "N/A"}`);
      console.log(
        `👤 Assignee: ${
          issue.fields?.assignee?.displayName ||
          issue.fields?.assignee?.emailAddress ||
          "Unassigned"
        }`
      );
      console.log(
        `👥 Reporter: ${
          issue.fields?.reporter?.displayName ||
          issue.fields?.reporter?.emailAddress ||
          "N/A"
        }`
      );
      if (issue.fields?.created) {
        console.log(
          `📅 Created: ${new Date(issue.fields.created).toLocaleString()}`
        );
      }
      if (issue.fields?.updated) {
        console.log(
          `🔄 Updated: ${new Date(issue.fields.updated).toLocaleString()}`
        );
      }
    }

    if (issueData.changelog) {
      const changelogData = issueData.changelog as { total?: number };
      console.log(`\n📜 Changelog entries: ${changelogData.total || 0}`);
    } else {
      console.log("\n📜 Changelog: N/A (not available)");
    }

    if (issueData.errors && issueData.errors.length > 0) {
      console.log("\n⚠️  Note: Some data could not be fetched.");
    }

    // Display branch information
    if (branchInfo) {
      console.log("\n🌿 Bitbucket Branch Information:");
      console.log(`   Branch: ${branchInfo.branchName || "N/A"}`);
      if (branchInfo.prId) {
        console.log(`   PR ID: ${branchInfo.prId}`);
      }
      if (branchInfo.branchUrl) {
        console.log(`   Branch URL: ${branchInfo.branchUrl}`);
      }
      if (branchInfo.prUrl) {
        console.log(`   PR URL: ${branchInfo.prUrl}`);
      }
      console.log(`   Source: ${branchInfo.source || "N/A"}`);
    } else {
      console.log("\n🌿 Bitbucket Branch: Not found");
      if (!workspace || !repo) {
        console.log(
          "   Note: workspace and repo must be configured in config.json"
        );
      }
      if (!BITBUCKET_EMAIL || !BITBUCKET_API_TOKEN) {
        console.log(
          "   Note: BITBUCKET_EMAIL and BITBUCKET_API_TOKEN environment variables are required"
        );
      }
    }
  } catch (error) {
    console.error("Failed to fetch Jira issue:", error);
    process.exit(1);
  }
};

main();
main();

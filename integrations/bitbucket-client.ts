/**
 * Bitbucket Client
 *
 * Bitbucket PR and diff helper functions.
 * Handles PR information retrieval and code change analysis.
 */

export interface BitbucketConfig {
  apiToken: string;
  baseUrl?: string;
  email?: string;
  [key: string]: unknown;
}

export interface BitbucketClient {
  getPullRequest(
    workspace: string,
    repoSlug: string,
    prId: string
  ): Promise<PullRequest>;
  getPRDiff(workspace: string, repoSlug: string, prId: string): Promise<string>;
  extractJiraTickets(pullRequest: PullRequest): string[];
  getChangedFiles(
    workspace: string,
    repoSlug: string,
    prId: string
  ): Promise<ChangedFile[]>;
  getSourceBranch(pullRequest: PullRequest): string;
}

export interface PullRequest {
  id: number;
  title: string;
  description?: string;
  source?: {
    branch?: {
      name: string;
    };
    repository?: {
      full_name?: string;
      [key: string]: unknown;
    };
  };
  destination?: {
    branch?: {
      name: string;
    };
    [key: string]: unknown;
  };
  links?: {
    comments?: {
      href?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ChangedFile {
  path: string;
  type: "added" | "modified" | "removed";
  [key: string]: unknown;
}

interface InternalClientConfig {
  apiToken: string;
  baseUrl: string;
  email?: string;
  getAuthHeader: () => string;
}

/**
 * Initializes the Bitbucket client with API credentials
 * @param config - Configuration object with API token and base URL
 * @returns Configured Bitbucket client instance
 */
export const initialize = (config: BitbucketConfig): BitbucketClient => {
  const baseUrl = config.baseUrl || "https://api.bitbucket.org/2.0";

  // Determine authentication method
  // If token contains ':', assume it's email:token format for Basic Auth
  // Otherwise, check if email is provided for Basic Auth, or use Bearer token
  const tokenContainsColon = config.apiToken.includes(":");
  let getAuthHeader: () => string;

  if (tokenContainsColon) {
    // API token in email:token format - use Basic Auth directly
    const credentials = Buffer.from(config.apiToken).toString("base64");
    getAuthHeader = () => `Basic ${credentials}`;
  } else if (config.email) {
    // API token with separate email - use Basic Auth with email:token
    const credentials = Buffer.from(
      `${config.email}:${config.apiToken}`
    ).toString("base64");
    getAuthHeader = () => `Basic ${credentials}`;
  } else {
    // Assume it's an access token - use Bearer auth
    getAuthHeader = () => `Bearer ${config.apiToken}`;
  }

  const clientConfig: InternalClientConfig = {
    apiToken: config.apiToken,
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    email: config.email,
    getAuthHeader,
  };

  const makeRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const url = `${clientConfig.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    headers.set("Authorization", clientConfig.getAuthHeader());

    // For diff endpoints, accept text/plain, otherwise JSON
    if (endpoint.includes("/diff")) {
      headers.set("Accept", "text/plain");
    } else {
      headers.set("Accept", "application/json");
    }

    // Only set Content-Type for non-GET requests
    if (options.method && options.method !== "GET") {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Bitbucket API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // For diff endpoints, return text
    if (endpoint.includes("/diff")) {
      return (await response.text()) as unknown as T;
    }

    return (await response.json()) as T;
  };

  return {
    getPullRequest: async (
      workspace: string,
      repoSlug: string,
      prId: string
    ) => {
      return makeRequest<PullRequest>(
        `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`
      );
    },
    getPRDiff: async (workspace: string, repoSlug: string, prId: string) => {
      return makeRequest<string>(
        `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`
      );
    },
    extractJiraTickets: (pullRequest: PullRequest) => {
      const tickets = new Set<string>();
      const jiraKeyPattern = /([A-Z][A-Z0-9]+-\d+)/g;

      // Extract from title
      if (pullRequest.title) {
        const titleMatches = pullRequest.title.match(jiraKeyPattern);
        if (titleMatches) {
          titleMatches.forEach((ticket) => {
            tickets.add(ticket);
          });
        }
      }

      // Extract from description
      if (pullRequest.description) {
        const descMatches = pullRequest.description.match(jiraKeyPattern);
        if (descMatches) {
          descMatches.forEach((ticket) => {
            tickets.add(ticket);
          });
        }
      }

      return Array.from(tickets);
    },
    getChangedFiles: async (
      workspace: string,
      repoSlug: string,
      prId: string
    ) => {
      // Fetch diffstat from PR endpoint
      const pr = await makeRequest<
        PullRequest & {
          diffstat?: Array<{
            new?: { path?: string };
            old?: { path?: string };
            status?: "added" | "modified" | "removed";
          }>;
        }
      >(`/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`);

      const changedFiles: ChangedFile[] = [];

      // Try to get diffstat from PR object
      if (pr.diffstat && Array.isArray(pr.diffstat)) {
        pr.diffstat.forEach((file) => {
          const path = file.new?.path || file.old?.path;
          if (path) {
            let type: "added" | "modified" | "removed" = "modified";
            if (file.status === "added" || (!file.old && file.new)) {
              type = "added";
            } else if (file.status === "removed" || (file.old && !file.new)) {
              type = "removed";
            } else if (file.status === "modified" || (file.old && file.new)) {
              type = "modified";
            }
            changedFiles.push({ path, type });
          }
        });
      } else {
        // Fallback: parse diff to get changed files
        const diff = await makeRequest<string>(
          `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/diff`
        );

        const diffLines = diff.split("\n");
        const filePaths = new Map<string, "added" | "modified" | "removed">();

        for (let i = 0; i < diffLines.length; i++) {
          const line = diffLines[i];

          // Git diff header: extract file paths (most reliable)
          if (line.startsWith("diff --git")) {
            const match = line.match(/diff --git a\/(.+?)\s+b\/(.+?)(?:\s|$)/);
            if (match) {
              const oldPath = match[1];
              const newPath = match[2];

              if (oldPath === "/dev/null" || oldPath === "null") {
                filePaths.set(newPath, "added");
              } else if (newPath === "/dev/null" || newPath === "null") {
                filePaths.set(oldPath, "removed");
              } else {
                filePaths.set(newPath, "modified");
              }
            }
          } else if (line.startsWith("--- a/")) {
            // Old file path
            const path = line.substring(6).trim();
            if (path && path !== "/dev/null" && path !== "null") {
              // Find the corresponding +++ line
              let foundNewPath = false;
              for (let j = i + 1; j < Math.min(i + 5, diffLines.length); j++) {
                if (diffLines[j].startsWith("+++ b/")) {
                  const newPath = diffLines[j].substring(6).trim();
                  if (
                    newPath &&
                    newPath !== "/dev/null" &&
                    newPath !== "null"
                  ) {
                    filePaths.set(newPath, "modified");
                    foundNewPath = true;
                  }
                  break;
                }
              }
              // If no corresponding +++ line found, file was removed
              if (!foundNewPath) {
                filePaths.set(path, "removed");
              }
            } else if (path === "/dev/null" || path === "null") {
              // Old path is null, check for new path
              for (let j = i + 1; j < Math.min(i + 5, diffLines.length); j++) {
                if (diffLines[j].startsWith("+++ b/")) {
                  const newPath = diffLines[j].substring(6).trim();
                  if (
                    newPath &&
                    newPath !== "/dev/null" &&
                    newPath !== "null"
                  ) {
                    filePaths.set(newPath, "added");
                  }
                  break;
                }
              }
            }
          } else if (line.startsWith("+++ b/")) {
            // New file path - only process if not already handled by diff --git
            const path = line.substring(6).trim();
            if (path && path !== "/dev/null" && path !== "null") {
              if (!filePaths.has(path)) {
                // Check if there was an old path before this
                let foundOldPath = false;
                for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                  if (diffLines[j].startsWith("--- a/")) {
                    const oldPath = diffLines[j].substring(6).trim();
                    if (
                      oldPath &&
                      oldPath !== "/dev/null" &&
                      oldPath !== "null"
                    ) {
                      filePaths.set(path, "modified");
                      foundOldPath = true;
                    }
                    break;
                  }
                }
                if (!foundOldPath) {
                  filePaths.set(path, "added");
                }
              }
            }
          }
        }

        filePaths.forEach((type, path) => {
          changedFiles.push({ path, type });
        });
      }

      return changedFiles;
    },
    getSourceBranch: (pullRequest: PullRequest) => {
      return pullRequest.source?.branch?.name || "";
    },
  };
};

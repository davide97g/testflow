/**
 * Jira Client
 *
 * Jira API helper functions for interacting with Jira.
 * Handles authentication, ticket retrieval, and result posting.
 */

export interface JiraConfig {
  apiToken: string;
  baseUrl: string;
  email?: string;
  [key: string]: unknown;
}

export interface JiraClient {
  getTicket(ticketKey: string): Promise<JiraTicket>;
  getLinkedTestCases(ticketKey: string): Promise<TestCaseReference[]>;
  postTestResults(ticketKey: string, testResults: unknown): Promise<JiraAPIResponse>;
  updateTicket(ticketKey: string, summary: string): Promise<JiraAPIResponse>;
}

export interface JiraTicket {
  key: string;
  id: string;
  fields: {
    summary?: string;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TestCaseReference {
  id: string;
  key?: string;
  [key: string]: unknown;
}

export interface JiraAPIResponse {
  id: string;
  key: string;
  [key: string]: unknown;
}

interface CommentResponse {
  id: string;
  self: string;
  body: {
    type: string;
    version: number;
    content: Array<{
      type: string;
      content: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  author: {
    accountId: string;
    displayName: string;
  };
  created: string;
  updated: string;
  [key: string]: unknown;
}

/**
 * Creates a Basic Auth header for Jira API authentication
 * @param email - Email address (optional, can use apiToken directly)
 * @param apiToken - Jira API token
 * @returns Base64 encoded authorization header value
 */
const createAuthHeader = (email: string | undefined, apiToken: string): string => {
  const credentials = email ? `${email}:${apiToken}` : `:${apiToken}`;
  return Buffer.from(credentials).toString("base64");
};

/**
 * Creates ADF (Atlassian Document Format) body for comments
 * @param text - Plain text to convert to ADF
 * @returns ADF formatted body object
 */
const createAdfBody = (
  text: string
): { type: string; version: number; content: Array<unknown> } => {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text,
          },
        ],
      },
    ],
  };
};

/**
 * Initializes the Jira client with API credentials
 * @param config - Configuration object with API token and base URL
 * @returns Configured Jira client instance
 */
export const initialize = (config: JiraConfig): JiraClient => {
  const { apiToken, baseUrl, email } = config;

  if (!baseUrl) {
    throw new Error("Base URL is required");
  }

  // Normalize base URL (remove trailing slash)
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const apiBaseUrl = `${normalizedBaseUrl}/rest/api/3`;

  /**
   * Gets the authorization header for a request
   * Prefers OAuth tokens if available, falls back to API token
   */
  const getAuthHeader = async (): Promise<string> => {
    // Try to get OAuth token first
    const { getValidAccessToken } = await import("./token-helper");
    const oauthToken = await getValidAccessToken("jira");

    if (oauthToken) {
      return `Bearer ${oauthToken}`;
    }

    // Fall back to API token if OAuth not available
    if (apiToken) {
      const authHeader = createAuthHeader(email, apiToken);
      return `Basic ${authHeader}`;
    }

    throw new Error(
      "No authentication method available. Please set up OAuth or provide an API token."
    );
  };

  /**
   * Makes an authenticated request to the Jira API
   */
  const makeRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${apiBaseUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    headers.set("Authorization", await getAuthHeader());
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Jira API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  };

  return {
    async getTicket(ticketKey: string): Promise<JiraTicket> {
      const ticket = await makeRequest<JiraTicket>(`/issue/${ticketKey}`);
      return ticket;
    },

    async getLinkedTestCases(ticketKey: string): Promise<TestCaseReference[]> {
      // Get the issue with issue links field included
      const issue = await makeRequest<
        JiraTicket & {
          fields: {
            issuelinks?: Array<{
              id: string;
              type: {
                id?: string;
                name?: string;
                inward?: string;
                outward?: string;
                self?: string;
              };
              inwardIssue?: {
                id: string;
                key: string;
                self?: string;
                fields?: {
                  summary?: string;
                  status?: {
                    name?: string;
                  };
                  issuetype?: {
                    id?: string;
                    name?: string;
                  };
                };
              };
              outwardIssue?: {
                id: string;
                key: string;
                self?: string;
                fields?: {
                  summary?: string;
                  status?: {
                    name?: string;
                  };
                  issuetype?: {
                    id?: string;
                    name?: string;
                  };
                };
              };
            }>;
            [key: string]: unknown;
          };
        }
      >(`/issue/${ticketKey}?fields=issuelinks`);

      const testCaseReferences: TestCaseReference[] = [];

      // Check if issue has links
      const links = issue.fields?.issuelinks || [];

      for (const link of links) {
        // Check if link type might indicate a test case relationship
        // Common link types: "Tests", "Test", "is tested by", "relates to", etc.
        const linkTypeName = link.type?.name?.toLowerCase() || "";
        const linkInward = link.type?.inward?.toLowerCase() || "";
        const linkOutward = link.type?.outward?.toLowerCase() || "";

        const isTestRelatedLink =
          linkTypeName.includes("test") ||
          linkInward.includes("test") ||
          linkOutward.includes("test");

        // Check both inward and outward issues
        const issuesToCheck = [link.inwardIssue, link.outwardIssue].filter(
          (issue): issue is NonNullable<typeof issue> => issue !== undefined
        );

        for (const linkedIssue of issuesToCheck) {
          const issueTypeName = linkedIssue.fields?.issuetype?.name?.toLowerCase() || "";

          // If it's a test-related link or the linked issue is a test type
          if (
            isTestRelatedLink ||
            issueTypeName === "test" ||
            issueTypeName.includes("test case")
          ) {
            // Avoid duplicates
            const alreadyAdded = testCaseReferences.some(
              (ref) => ref.id === linkedIssue.id || ref.key === linkedIssue.key
            );

            if (!alreadyAdded && linkedIssue.id && linkedIssue.key) {
              testCaseReferences.push({
                id: linkedIssue.id,
                key: linkedIssue.key,
              });
            }
          }
        }
      }

      // Also check remote links for test cases (e.g., Zephyr test cases)
      try {
        const remoteLinks = await makeRequest<
          Array<{
            id: string;
            globalId?: string;
            issueId?: string;
            object?: {
              title?: string;
              summary?: string;
              [key: string]: unknown;
            };
            relationship?: string;
            [key: string]: unknown;
          }>
        >(`/issue/${ticketKey}/remotelink`);

        for (const remoteLink of remoteLinks) {
          // Filter for Zephyr or test-related remote links
          // Remote links from Zephyr typically have relationship "Test" or similar
          const relationship = (remoteLink.relationship || "").toLowerCase();
          const objectTitle = (remoteLink.object?.title || "").toLowerCase();

          if (
            relationship.includes("test") ||
            objectTitle.includes("test") ||
            objectTitle.includes("zephyr")
          ) {
            if (remoteLink.id) {
              testCaseReferences.push({
                id: String(remoteLink.id),
                key: remoteLink.object?.title as string | undefined,
              });
            }
          }
        }
      } catch {
        // Remote links might not be available or might fail, continue without them
        // This is expected if issue linking is not configured or permissions are insufficient
      }

      return testCaseReferences;
    },

    async postTestResults(ticketKey: string, testResults: unknown): Promise<JiraAPIResponse> {
      // Format test results as a comment
      const resultsText = JSON.stringify(testResults, null, 2);
      const commentBody = `Test Execution Results:\n\n\`\`\`\n${resultsText}\n\`\`\``;

      const commentPayload = {
        body: createAdfBody(commentBody),
      };

      const comment = await makeRequest<CommentResponse>(`/issue/${ticketKey}/comment`, {
        method: "POST",
        body: JSON.stringify(commentPayload),
      });

      // Get the issue to return the full response
      const issue = await makeRequest<JiraAPIResponse>(`/issue/${ticketKey}`);

      return {
        ...issue,
        commentId: comment.id,
      };
    },

    async updateTicket(ticketKey: string, summary: string): Promise<JiraAPIResponse> {
      // Add comment with test execution summary
      const commentPayload = {
        body: createAdfBody(summary),
      };

      await makeRequest<CommentResponse>(`/issue/${ticketKey}/comment`, {
        method: "POST",
        body: JSON.stringify(commentPayload),
      });

      // Get the updated issue
      const issue = await makeRequest<JiraAPIResponse>(`/issue/${ticketKey}`);

      return issue;
    },
  };
};

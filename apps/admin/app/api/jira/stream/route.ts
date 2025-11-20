import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  bitbucket: z
    .object({
      workspace: z.string(),
      repo: z.string(),
    })
    .optional(),
  jira: z.object({
    baseUrl: z.string().url(),
    boardId: z.number().optional(),
    assignee: z.string().optional(),
    statuses: z.array(z.string()).optional(),
  }),
  confluence: z
    .object({
      baseUrl: z.string().url(),
    })
    .optional(),
});

interface CompactIssue {
  key: string;
  title: string;
  status: string;
  prOpen: "Y" | "N";
  branchName?: string;
  branchUrl?: string;
  confluencePages?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const config = configSchema.parse(body.config);

        const envVars = await getEnvVars();
        const JIRA_EMAIL = envVars.JIRA_EMAIL;
        const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;
        const BITBUCKET_EMAIL = envVars.BITBUCKET_EMAIL;
        const BITBUCKET_API_TOKEN = envVars.BITBUCKET_API_TOKEN;
        const CONFLUENCE_EMAIL = envVars.CONFLUENCE_EMAIL;
        const CONFLUENCE_API_TOKEN = envVars.CONFLUENCE_API_TOKEN;

        if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "JIRA_EMAIL and JIRA_API_TOKEN are required",
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // Create Jira auth
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
          "base64"
        );
        const headers = {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        };

        let normalizedBaseUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
        normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

        const statuses = config.jira.statuses || [
          "To Do",
          "In Progress",
          "Pull Requested",
          "Dev Release",
        ];

        // Build JQL query
        const jqlParts: string[] = [];
        jqlParts.push(
          `status IN (${statuses.map((s) => `"${s}"`).join(", ")})`
        );

        if (config.jira.assignee) {
          jqlParts.push(`assignee = "${config.jira.assignee}"`);
        }

        const jql = jqlParts.join(" AND ");

        // First, get total count
        const initialUrl = `${normalizedBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
          jql
        )}&startAt=0&maxResults=1&fields=key,summary,status`;

        const initialResponse = await axios.get(initialUrl, { headers });
        const initialData = initialResponse.data as {
          total?: number;
        };

        const total = initialData.total || 0;

        // Send total count
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "total", total })}\n\n`
          )
        );

        let startAt = 0;
        const maxResults = 1;
        let hasMore = true;
        let processedCount = 0;
        const processedKeys = new Set<string>();
        let nextPageToken: string | undefined;

        // Fetch issues one by one
        while (hasMore) {
          let searchUrl = `${normalizedBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
            jql
          )}&startAt=${startAt}&maxResults=${maxResults}&fields=key,summary,status`;
          
          // Use nextPageToken if available (for cursor-based pagination)
          if (nextPageToken) {
            searchUrl = `${normalizedBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
              jql
            )}&nextPageToken=${encodeURIComponent(nextPageToken)}&maxResults=${maxResults}&fields=key,summary,status`;
          }

          const response = await axios.get(searchUrl, { headers });
          const data = response.data as {
            issues?: Array<{
              key?: string;
              fields?: {
                summary?: string;
                status?: { name?: string };
              };
            }>;
            total?: number;
            startAt?: number;
            maxResults?: number;
            nextPageToken?: string;
            isLast?: boolean;
          };

          if (!data.issues || data.issues.length === 0) {
            hasMore = false;
            break;
          }

          // Process each issue
          for (const issue of data.issues) {
            const key = issue.key || "";

            // Skip if we've already processed this issue
            if (!key || processedKeys.has(key)) {
              continue;
            }

            processedKeys.add(key);

            const title = issue.fields?.summary || "";
            const status = issue.fields?.status?.name || "";

            const issueData: CompactIssue = {
              key,
              title,
              status,
              prOpen: "N",
            };

            // Check for open PR
            if (config.bitbucket && BITBUCKET_EMAIL && BITBUCKET_API_TOKEN) {
              try {
                const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
                const bbAuth = Buffer.from(
                  `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
                ).toString("base64");
                const bbHeaders = {
                  Authorization: `Basic ${bbAuth}`,
                  Accept: "application/json",
                };

                const ticketPattern = new RegExp(
                  key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i"
                );

                const prsUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/pullrequests?state=OPEN&pagelen=50`;
                const prsResponse = await axios.get(prsUrl, {
                  headers: bbHeaders,
                });
                const prsData = prsResponse.data as {
                  values?: Array<{
                    title?: string;
                    description?: string;
                    source?: { branch?: { name?: string } };
                  }>;
                };

                let hasOpenPR = false;
                if (prsData.values) {
                  for (const pr of prsData.values) {
                    const titleMatch = pr.title && ticketPattern.test(pr.title);
                    const descMatch =
                      pr.description && ticketPattern.test(pr.description);
                    const branchMatch =
                      pr.source?.branch?.name &&
                      ticketPattern.test(pr.source.branch.name);

                    if (titleMatch || descMatch || branchMatch) {
                      hasOpenPR = true;
                      if (pr.source?.branch?.name) {
                        issueData.branchName = pr.source.branch.name;
                      }
                      break;
                    }
                  }
                }

                issueData.prOpen = hasOpenPR ? "Y" : "N";

                // Try to get branch from branches API
                if (!issueData.branchName) {
                  try {
                    const branchesUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/refs/branches?pagelen=100`;
                    const branchesResponse = await axios.get(branchesUrl, {
                      headers: bbHeaders,
                    });
                    const branchesData = branchesResponse.data as {
                      values?: Array<{
                        name?: string;
                        links?: { html?: { href?: string } };
                      }>;
                    };

                    if (branchesData.values) {
                      for (const branch of branchesData.values) {
                        if (branch.name && ticketPattern.test(branch.name)) {
                          issueData.branchName = branch.name;
                          issueData.branchUrl = branch.links?.html?.href;
                          break;
                        }
                      }
                    }
                  } catch {
                    // Ignore branch fetch errors
                  }
                }
              } catch {
                // Ignore Bitbucket errors
              }
            }

            // Fetch Confluence pages if configured
            if (config.confluence && CONFLUENCE_EMAIL && CONFLUENCE_API_TOKEN) {
              try {
                const confAuth = Buffer.from(
                  `${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`
                ).toString("base64");
                const confHeaders = {
                  Authorization: `Basic ${confAuth}`,
                  Accept: "application/json",
                };

                // Get remote links from Jira
                const remoteLinksUrl = `${normalizedBaseUrl}/rest/api/3/issue/${key}/remotelink`;
                const remoteLinksResponse = await axios.get(remoteLinksUrl, {
                  headers,
                });
                const remoteLinks = remoteLinksResponse.data as Array<{
                  object?: {
                    url?: string;
                    title?: string;
                  };
                }>;

                const confluencePages: Array<{
                  id: string;
                  title: string;
                  url: string;
                }> = [];

                if (remoteLinks) {
                  for (const link of remoteLinks) {
                    const url = link.object?.url || "";
                    if (url.includes("confluence") || url.includes("wiki")) {
                      // Extract page ID from URL
                      const pageIdMatch = url.match(
                        /\/pages\/viewpage\.action\?pageId=(\d+)/
                      );
                      if (pageIdMatch) {
                        confluencePages.push({
                          id: pageIdMatch[1],
                          title: link.object?.title || "Untitled",
                          url,
                        });
                      } else {
                        // Try alternative URL format
                        const altMatch = url.match(
                          /\/spaces\/[^/]+\/pages\/(\d+)/
                        );
                        if (altMatch) {
                          confluencePages.push({
                            id: altMatch[1],
                            title: link.object?.title || "Untitled",
                            url,
                          });
                        }
                      }
                    }
                  }
                }

                issueData.confluencePages = confluencePages;
              } catch {
                // Ignore Confluence errors
              }
            }

            processedCount++;

            // Send issue to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "issue",
                  issue: issueData,
                  progress: processedCount,
                  total,
                })}\n\n`
              )
            );
          }

          // Check if there are more results
          // Use isLast if available, otherwise check total
          if (data.isLast === true) {
            hasMore = false;
          } else if (data.nextPageToken) {
            nextPageToken = data.nextPageToken;
            startAt = 0; // Reset startAt when using nextPageToken
          } else if (
            data.total !== undefined &&
            startAt + data.issues.length >= data.total
          ) {
            hasMore = false;
          } else {
            startAt += maxResults;
          }
          
          // Safety check: if we got no new issues and no nextPageToken, stop
          if (data.issues && data.issues.length === 0 && !data.nextPageToken && data.isLast !== false) {
            hasMore = false;
          }
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              total: processedCount,
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        console.error("Error in stream:", error);
        const errorMessage = axios.isAxiosError(error)
          ? error.response?.data || error.message
          : "Failed to fetch Jira issues";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: errorMessage,
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import { getEnvVars } from "@/lib/env";
import axios from "axios";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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

const filterOverridesSchema = z
  .object({
    useAssignee: z.boolean().optional(),
    assignee: z.string().nullable().optional(),
    useStatuses: z.boolean().optional(),
    statuses: z.array(z.string()).optional(),
    useLabels: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
  })
  .optional();

const requestSchema = z.object({
  config: configSchema,
  query: z.string().optional().default(""),
  maxResults: z.number().min(1).max(200).optional().default(50),
  startAt: z.number().min(0).optional().default(0),
  filterOverrides: filterOverridesSchema,
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

function escapeJqlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, query, maxResults, startAt, filterOverrides } =
      requestSchema.parse(body);

    const envVars = await getEnvVars();
    const JIRA_EMAIL = envVars.JIRA_EMAIL;
    const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;
    const BITBUCKET_EMAIL = envVars.BITBUCKET_EMAIL;
    const BITBUCKET_API_TOKEN = envVars.BITBUCKET_API_TOKEN;
    const CONFLUENCE_EMAIL = envVars.CONFLUENCE_EMAIL;
    const CONFLUENCE_API_TOKEN = envVars.CONFLUENCE_API_TOKEN;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: "JIRA_EMAIL and JIRA_API_TOKEN are required" },
        { status: 400 }
      );
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

    const defaultStatuses = [
      "To Do",
      "In Progress",
      "Pull Requested",
      "Dev Release",
    ];
    const useAssignee =
      filterOverrides?.useAssignee ?? Boolean(config.jira.assignee);
    const assigneeValue =
      filterOverrides?.assignee !== undefined && filterOverrides.assignee !== null
        ? filterOverrides.assignee
        : config.jira.assignee ?? null;
    const useStatuses = filterOverrides?.useStatuses ?? true;
    const statuses =
      useStatuses && filterOverrides?.statuses?.length
        ? filterOverrides.statuses
        : config.jira.statuses?.length
          ? config.jira.statuses
          : defaultStatuses;
    const useLabels = filterOverrides?.useLabels ?? false;
    const labels = filterOverrides?.labels ?? [];

    // Resolve board filter ID when boardId is set (scope search to board)
    let boardFilterId: string | null = null;
    const filterDescriptionParts: string[] = [];
    const rawBoardId = config.jira.boardId;
    const boardId =
      typeof rawBoardId === "number"
        ? rawBoardId
        : typeof rawBoardId === "string" && /^\d+$/.test(rawBoardId)
          ? parseInt(rawBoardId, 10)
          : null;
    if (boardId != null) {
      try {
        const agileUrl = `${normalizedBaseUrl}/rest/agile/1.0/board/${boardId}`;
        const boardRes = await axios.get(agileUrl, { headers });
        const boardData = boardRes.data as { filter?: { id?: string } };
        if (boardData.filter?.id) {
          boardFilterId = String(boardData.filter.id);
          filterDescriptionParts.push(`Board ${boardId}`);
        }
      } catch {
        // Board or agile API not available; fall back to status/assignee only
      }
    }
    if (useAssignee && assigneeValue) {
      filterDescriptionParts.push(`assignee: ${assigneeValue}`);
    }
    if (useStatuses && statuses.length) {
      filterDescriptionParts.push(`statuses: ${statuses.join(", ")}`);
    }
    if (useLabels && labels.length) {
      filterDescriptionParts.push(`labels: ${labels.join(", ")}`);
    }

    // Base JQL: board filter (if any) + assignee + statuses + labels
    const baseJqlParts: string[] = [];
    if (boardFilterId) {
      baseJqlParts.push(`filter = ${boardFilterId}`);
    }
    if (useStatuses && statuses.length) {
      baseJqlParts.push(
        `status IN (${statuses.map((s) => `"${escapeJqlString(s)}"`).join(", ")})`
      );
    }
    if (useAssignee && assigneeValue) {
      baseJqlParts.push(`assignee = "${escapeJqlString(assigneeValue)}"`);
    }
    if (useLabels && labels.length) {
      baseJqlParts.push(
        `labels IN (${labels.map((l) => `"${escapeJqlString(l)}"`).join(", ")})`
      );
    }

    const trimmedQuery = (query ?? "").trim();
    const extractedKeyFromUrl = trimmedQuery.match(
      /(?:browse|issues)\/([A-Z][A-Z0-9]*-\d+)/i
    )?.[1];
    const normalizedQuery = extractedKeyFromUrl
      ? extractedKeyFromUrl.toUpperCase()
      : trimmedQuery;

    if (normalizedQuery) {
      if (/^[A-Z][A-Z0-9]*-\d+$/i.test(normalizedQuery)) {
        baseJqlParts.push(`key = "${normalizedQuery.toUpperCase()}"`);
      } else {
        baseJqlParts.push(
          `text ~ "${normalizedQuery.replace(/"/g, '\\"')}"`
        );
      }
    }
    const jql =
      baseJqlParts.join(" AND ") + " ORDER BY updated DESC";

    const issues: CompactIssue[] = [];
    const filterDescription = filterDescriptionParts.join(" • ");

    // Fetch issues from Jira (search runs on Jira, not on pre-downloaded list)
    const searchUrl = `${normalizedBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
      jql
    )}&startAt=${startAt}&maxResults=${Math.min(maxResults, 200)}&fields=key,summary,status`;

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
    };

    if (!data.issues || data.issues.length === 0) {
      return NextResponse.json({
        issues: [],
        filterDescription,
        total: data.total ?? 0,
      });
    }

    // Process issues
    for (const issue of data.issues) {
      const key = issue.key || "";
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
          const prsResponse = await axios.get(prsUrl, { headers: bbHeaders });
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
                  const altMatch = url.match(/\/spaces\/[^/]+\/pages\/(\d+)/);
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

      issues.push(issueData);
    }

    return NextResponse.json({
      issues,
      filterDescription,
      total: data.total ?? issues.length,
    });
  } catch (error) {
    console.error("Error searching Jira issues:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to search Jira issues",
          details: error.response?.data || error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to search Jira issues" },
      { status: 500 }
    );
  }
}

